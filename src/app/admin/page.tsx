import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/admin/dashboard");

  const { error } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/admin/dashboard",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/admin?error=${err.type}`);
      }
      throw err;
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-5">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">linse</h1>
          <p className="text-sm text-zinc-500">Host sign in</p>
        </div>
        <form action={login} className="space-y-3">
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Invalid email or password.
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded-md bg-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 text-zinc-50 px-3 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
