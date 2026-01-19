import Link from "next/link";
import { Palette, Zap, History, Download, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="text-primary" size={28} />
            <span className="font-bold text-xl">Flora Fauna</span>
          </div>
          <Link
            href="/canvas"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Open Canvas
            <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-pink-500 via-violet-500 to-blue-500 bg-clip-text text-transparent">
            AI Generation Canvas
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Create stunning images and videos with a visual workflow editor.
            Connect prompts, references, and generators in intuitive node-based workflows.
          </p>
          <Link
            href="/canvas"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl text-lg font-medium hover:bg-primary/90 transition-colors shadow-lg"
          >
            Start Creating
            <ArrowRight size={20} />
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={<Palette className="text-pink-500" size={24} />}
            title="Visual Workflows"
            description="Connect nodes to create complex generation pipelines with drag-and-drop simplicity."
          />
          <FeatureCard
            icon={<Zap className="text-violet-500" size={24} />}
            title="Auto Execution"
            description="Run entire workflows automatically with intelligent dependency resolution."
          />
          <FeatureCard
            icon={<History className="text-blue-500" size={24} />}
            title="Full History"
            description="Track every generation with searchable history and usage analytics."
          />
          <FeatureCard
            icon={<Download className="text-green-500" size={24} />}
            title="Export & Import"
            description="Save your projects as ZIP files with all assets for easy sharing and backup."
          />
        </div>

        {/* Models Section */}
        <div className="mt-20 text-center">
          <h2 className="text-2xl font-semibold mb-6">Supported Models</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {["Flux Pro", "Flux Schnell", "SDXL", "Seedance 1.5", "Kling AI", "Minimax"].map(
              (model) => (
                <span
                  key={model}
                  className="px-4 py-2 bg-card border rounded-full text-sm"
                >
                  {model}
                </span>
              )
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-sm text-muted-foreground">
          Flora Fauna Clone - Built with Next.js, React Flow, and Zustand
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 bg-card border rounded-xl">
      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
