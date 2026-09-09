import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-4">Bem-vindo ao Shopifyy</h1>
        <p className="text-muted-foreground">Projeto Auth30 integrado</p>
        
        <div className="mt-8 flex gap-4">
          <Link href="/auth30-demo" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
            Ver Auth30
          </Link>
          <Link href="/lamp" className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg">
            Ver Lamp
          </Link>
        </div>
      </div>
    </div>
  );
}
