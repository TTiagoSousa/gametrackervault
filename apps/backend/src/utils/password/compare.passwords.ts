import * as bcrypt from 'bcrypt';

export async function comparePasswords(args: {
  password: string;
  hash: string;
}) {
  return await bcrypt.compare(args.password, args.hash);
}
