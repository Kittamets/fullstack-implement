import argon2 from 'argon2'

export class PasswordPolicyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PasswordPolicyError'
  }
}

export function validatePasswordPolicy(password: string): void {
  if (password.length < 15) {
    throw new PasswordPolicyError('Password must be at least 15 characters')
  }
  if (password.length > 128) {
    throw new PasswordPolicyError('Password must be at most 128 characters')
  }
}

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 65536,   // 64 MB
    timeCost: 3,
    parallelism: 4,
  })
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain)
  } catch {
    return false
  }
}
