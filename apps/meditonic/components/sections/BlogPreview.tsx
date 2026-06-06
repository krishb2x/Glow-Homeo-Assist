import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { DUMMY_BLOG_POSTS } from "@/lib/dummy-data";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function BlogPreview() {
  return (
    <section className="section-padding bg-mt-bg">
      <div className="section-container">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:items-end">
          <ScrollReveal className="max-w-2xl">
            <h2 className="font-display text-heading-xl text-mt-text sm:text-display-lg">
              Health Insights
            </h2>
            <p className="mt-4 text-body-lg text-mt-text-secondary text-balance">
              Expert advice on mental health, hormonal balance, and living a 
              holistic lifestyle from Dr. Aman Agrawal.
            </p>
          </ScrollReveal>
          
          <ScrollReveal delay={0.2} className="hidden md:block">
            <Button asChild variant="ghost" className="group">
              <Link href="/blog">
                Read All Articles
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </ScrollReveal>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {DUMMY_BLOG_POSTS.map((post, index) => (
            <ScrollReveal 
              key={post.slug} 
              delay={0.1 * (index + 1)}
              direction="up"
            >
              <Card hover className="h-full overflow-hidden flex flex-col group">
                <Link href={`/blog/${post.slug}`} className="block relative aspect-[16/10] overflow-hidden">
                  <div className="absolute inset-0 bg-mt-primary/20 mix-blend-multiply opacity-0 transition-opacity group-hover:opacity-100 z-10" />
                  <img
                    src={post.image}
                    alt={post.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute left-4 top-4 z-20">
                    <Badge variant="default" className="bg-white/90 text-mt-primary shadow-sm backdrop-blur-md hover:bg-white">
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

        <div className="mt-10 flex justify-center md:hidden">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/blog">View All Articles</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
