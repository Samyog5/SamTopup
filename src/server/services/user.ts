import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import type { UserRole } from "@/generated/prisma/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}

export interface UserWithRole {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  image: string | null;
}

// ─── Service Functions ───────────────────────────────────────────────────────

const SALT_ROUNDS = 12;

/**
 * Get a user by email address.
 * Used during credentials authentication.
 */
export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
      role: true,
      image: true,
      emailVerified: true,
    },
  });
}

/**
 * Get a user by ID.
 */
export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
    },
  });
}

/**
 * Create a new user with a hashed password.
 * Also creates an empty wallet for the user.
 */
export async function createUser(input: CreateUserInput) {
  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email: input.email.toLowerCase().trim(),
      password: hashedPassword,
      role: "USER",
      wallet: {
        create: {
          balance: 0,
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
    },
  });

  return user;
}

/**
 * Check if a user with the given email already exists.
 */
export async function userExists(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true },
  });
  return user !== null;
}

/**
 * Verify a plaintext password against a hashed password.
 */
export async function verifyPassword(
  plaintext: string,
  hashed: string
): Promise<boolean> {
  return bcrypt.compare(plaintext, hashed);
}
