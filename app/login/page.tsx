import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const demoEnabled = process.env.AUTH_DEMO_LOGIN === "1";
  const googleConfigured = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );
  return (
    <LoginForm
      demoEnabled={demoEnabled}
      googleConfigured={googleConfigured}
      error={error}
    />
  );
}
