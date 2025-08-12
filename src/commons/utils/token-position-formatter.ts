function sequenceGetter(inputTokens) {
  const sequenceMap = new Map();

  const flowMap = new Map();
  const reverseFlowMap = new Map();

  inputTokens.forEach((token) => {
    if (token.outgoing) {
      flowMap.set(token.activity_id, token.outgoing);
    }
    if (token.incoming) {
      reverseFlowMap.set(token.incoming, token.activity_id);
    }
  });

  const startNode = inputTokens.find((token) => !token.incoming);

  if (!startNode) {
    inputTokens.forEach((token, index) => {
      sequenceMap.set(token.activity_id, index + 1);
    });
    return (activityId) => sequenceMap.get(activityId) ?? 1;
  }

  let currentSequence = 1;
  let currentNode = startNode;
  const visited = new Set();

  while (currentNode && !visited.has(currentNode.activity_id)) {
    visited.add(currentNode.activity_id);
    sequenceMap.set(currentNode.activity_id, currentSequence);
    currentSequence++;

    if (currentNode.outgoing) {
      const nextActivityId = reverseFlowMap.get(currentNode.outgoing);
      currentNode = inputTokens.find(
        (token) => token.activity_id === nextActivityId,
      );
    } else {
      break;
    }
  }

  inputTokens.forEach((token) => {
    if (!sequenceMap.has(token.activity_id)) {
      sequenceMap.set(token.activity_id, currentSequence);
      currentSequence++;
    }
  });

  return (activityId) => sequenceMap.get(activityId) || 1;
}

export function convertTokenFormat(inputTokens) {
  if (!Array.isArray(inputTokens)) {
    console.error(
      'convertTokenFormat expects an array, got:',
      typeof inputTokens,
    );
    return [];
  }

  const getSequence = sequenceGetter(inputTokens);

  const convertedTokens = inputTokens.map((token) => ({
    type: token?.type,
    status: token?.status,
    activity_name: token?.activity_name,
    activity_id: token?.activity_id,
    activity_key: token?.activity_key,
    sequence: getSequence(token?.activity_id),
    updated_at: token?.updated_at,
  }));

  const statusOrder = { completed: 0, running: 1, pending: 2 };
  const sortedTokens = convertedTokens.slice().sort((a, b) => {
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    return a.sequence - b.sequence;
  });

  return sortedTokens;
}
