import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 text-center">
          <div className="text-6xl mb-4">😵</div>
          <h2 className="text-xl font-bold text-foreground mb-2">Une erreur s'est produite</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            {this.state.error?.message || "Quelque chose s'est mal passé. Réessaie ou retourne à l'accueil."}
          </p>
          <div className="flex gap-3">
            <Button onClick={() => this.setState({ hasError: false, error: null })} variant="outline" className="rounded-xl">
              Réessayer
            </Button>
            <Button onClick={() => window.location.href = "/"} className="rounded-xl">
              Accueil
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}