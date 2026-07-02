import PlaybookView from "@/components/templates/PlaybookView";

export default function PlaybookPage() {
  return (
    <div className="h-full overflow-auto bg-surface-base p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-lg font-semibold text-text-primary">
          Playbook Execution
        </h1>
        <PlaybookView />
      </div>
    </div>
  );
}
