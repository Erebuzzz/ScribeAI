/*
  Warnings:

  - You are about to drop the column `token` on the `AuthSession` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "AuthSession_token_key";

-- AlterTable
ALTER TABLE "AuthSession" DROP COLUMN "token";
