import Logo from "@/components/Logo";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-[#0D0D0D] px-6">
      <main className="flex flex-col items-center gap-6 text-center">
        <Logo size="lg" theme="dark" />
        <p className="text-sm font-medium tracking-wide text-neutral-400">
          Client portal · FixRevOps
        </p>
        <p className="max-w-sm text-sm leading-6 text-neutral-500">
          If you&apos;re a client, use the magic link from your welcome email to
          access your portal.
        </p>
        <a
          href="https://fixrevops.io"
          className="mt-2 inline-flex items-center rounded-lg bg-[#F5A623] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-95"
        >
          Visit fixrevops.io
        </a>
      </main>
    </div>
  );
}
