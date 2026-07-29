import { Layout } from "@/components/Layout";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, Cpu, Key, ShieldCheck, Calculator, Database, Mail, Zap } from "lucide-react";

export default function DocsIndex() {
  const docs = [
    { title: "Architecture", description: "End-to-end request flow", href: "/docs/architecture", icon: Cpu },
    { title: "JWT Auth", description: "Token structure & lifecycle", href: "/docs/jwt", icon: Key },
    { title: "Security", description: "Filter chain & validation", href: "/docs/security", icon: ShieldCheck },
    { title: "Algorithm", description: "Expense splitting & debt minimization", href: "/docs/algorithm", icon: Calculator },
    { title: "Caching", description: "TTL & invalidation strategies", href: "/docs/caching", icon: Zap },
    { title: "Database", description: "Entity relationships", href: "/docs/database", icon: Database },
    { title: "Email", description: "SMTP notification workflow", href: "/docs/email", icon: Mail },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Documentation</h1>
          <p className="text-muted-foreground">Technical walkthroughs of the systems powering Splitter.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc) => (
            <Link key={doc.href} href={doc.href}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full group">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="p-2 bg-primary/10 rounded-md text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <doc.icon className="h-5 w-5" />
                    </div>
                    {doc.title}
                  </CardTitle>
                  <CardDescription>{doc.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
