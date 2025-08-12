import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommonMethods } from 'src/commons/utils/common-methods';

export const fetchSecrets = async (secretName: string, region: string) => {
  const client = new SecretsManagerClient({
    region: region,
  });
  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secretName,
      }),
    );
    if (response.SecretString) {
      return JSON.parse(response.SecretString);
    }
    throw new NotFoundException(CommonMethods.getErrorMsg('E_7006'));
  } catch (error) {
    console.error('Error fetching secret:', error);
    throw new BadRequestException(error.message);
  }
};
