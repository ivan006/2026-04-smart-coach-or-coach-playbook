interface PageShellProps {
  icon: string;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}

const PageShell = ({ icon, title, subtitle, children }: PageShellProps) => {
  return (
    <div className="ml-20 min-h-screen flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <span className="text-6xl mb-6 block">{icon}</span>
        <h1 className="text-4xl font-bold text-foreground mb-3">{title}</h1>
        <p className="text-muted-foreground text-lg mb-10">{subtitle}</p>
        {children}
        <div className="inline-flex items-center gap-2 bg-secondary px-5 py-3 rounded-lg border border-border">
          <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-secondary-foreground font-medium text-sm">Work in progress</span>
        </div>
      </div>
    </div>
  );
};

export default PageShell;
