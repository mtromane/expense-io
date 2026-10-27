export default function ManagerForbidden() {
  return (
    <main className="flex flex-col items-center gap-2 py-16 text-center">
      <h1 className="text-xl font-semibold">Accès réservé aux managers</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Cette page n&apos;est visible que par les utilisateurs de rôle manager.
      </p>
    </main>
  )
}
