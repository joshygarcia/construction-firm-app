// All authenticated pages read from the on-disk store, which is initialised
// at runtime (inside Electron) from APP_DATA_DIR. Prerendering at build time
// would bake dev-time seed data into the shipped HTML, so force dynamic SSR.
export const dynamic = "force-dynamic";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
