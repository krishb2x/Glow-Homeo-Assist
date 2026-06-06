import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Clock, Search } from "lucide-react";
import { BLOG_CATEGORIES } from "@/lib/constants";
import { DUMMY_BLOG_POSTS } from "@/lib/dummy-data";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import CTABand from "@/components/sections/CTABand";

export function generateStaticParams() {
  return BLOG_CATEGORIES.map((cat) => ({
    cat: cat.slug,
  }));
}

export default async function BlogCategoryPage({
  params,
}: {
  params: Promise<{ cat: string }>;
}) {
  const resolvedParams = await params;
  const category = BLOG_CATEGORIES.find((c) => c.slug === resolvedParams.cat);

  if (!category) {
    notFound();
  }

  // Filter posts by category (using simple string matching for dummy data)
  const categoryPosts = DUMMY_BLOG_POSTS.filter(
    (p) => p.category.toLowerCase() === category.label.toLowerCase()
  );

  return (
    <div className="flex flex-col">
      <section className="bg-mt-primary-bg pt-24 pb-16">
        <div className="section-container text-center">
          <ScrollReveal direction="up">
            <h1 className="font-display text-display-lg sm:text-display-xl text-mt-text mb-6">
              {category.label} Articles
            </h1>
            <p className="mx-auto max-w-2xl text-body-lg text-mt-text-secondary">
              Explore our collection of articles specifically focused on {category.label.toLowerCase()}.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="section-padding bg-white min-h-[50vh]">
        <div className="section-container">
          
          {/* Categories & Search */}
          <div className="mb-12 flex flex-col items-center justify-between gap-6 md:flex-row border-b border-mt-border pb-8">
            <div className="flex flex-wrap items-center gap-2">
              <Link 
                href="/blog"
                className="rounded-full px-4 py-2 text-sm font-semibold bg-mt-bg text-mt-text-secondary hover:bg-mt-primary/10 hover:text-mt-primary transition-colors"
              >
                All Articles
              </Link>
              {BLOG_CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/blog/category/${cat.slug}`}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    cat.slug === category.slug 
                      ? "bg-mt-primary text-white" 
                      : "bg-mt-bg text-mt-text-secondary hover:bg-mt-primary/10 hover:text-mt-primary"
                  }`}
                >
                  {cat.label}
                </Link>
              ))}
            </div>

            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mt-text-tertiary" />
              <Input type="text" placeholder={`Search in ${category.label}...`} className="pl-9" />
            </div>
          </div>

          {/* Post Grid */}
          {categoryPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {categoryPosts.map((post, index) => (
                <ScrollReveal key={post.slug} direction="up" delay={0.1 * index}>
                  <Card hover className="h-full overflow-hidden flex flex-col group border-0 shadow-md">
                    <Link href={`/blog/${post.slug}`} className="block relative aspect-[16/10] overflow-hidden bg-mt-bg">
                      <div className="absolute inset-0 bg-mt-primary/20 mix-blend-multiply opacity-0 transition-opacity group-hover:opacity-100 z-10" />
                      <img
                        src={post.image}
                        alt={post.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute left-4 top-4 z-20">
                        <Badge variant="default" className="bg-white/90 text-mt-primary shadow-sm backdrop-blur-md">
                          {post.category}
                        </Badge>
                      </div>
                    </Link>
                    
                    <CardHeader className="flex-1 pb-4">
                      <div className="mb-3 flex items-center gap-4 text-xs text-mt-text-tertiary">
                        <time dateTime={new Date(post.date).toISOString()}>{post.date}</time>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{post.readTime}</span>
                        </div>
                      </div>
                      <CardTitle className="text-xl leading-tight transition-colors group-hover:text-mt-primary line-clamp-2">
                        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                      </CardTitle>
                      <CardDescription className="mt-3 line-clamp-3">
                        {post.excerpt}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <Link 
                        href={`/blog/${post.slug}`}
                        className="inline-flex items-center text-sm font-semibold text-mt-primary hover:text-mt-primary-dark"
                      >
                        Read Article <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Link>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-mt-bg text-mt-text-tertiary mb-4">
                <Search className="h-8 w-8" />
              </div>
              <h3 className="font-display text-xl font-bold text-mt-text mb-2">No articles found</h3>
              <p className="text-mt-text-secondary mb-6">
                We haven't published any articles in the {category.label} category yet.
              </p>
              <Link href="/blog" className="text-mt-primary font-semibold hover:underline">
                View all articles &rarr;
              </Link>
            </div>
          )}
        </div>
      </section>

      <CTABand />
    </div>
  );
}
