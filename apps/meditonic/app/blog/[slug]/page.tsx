import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Share2 } from "lucide-react";
import { BRAND } from "@/lib/constants";
import { DUMMY_BLOG_POSTS } from "@/lib/dummy-data";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { Badge } from "@/components/ui/Badge";
import CTABand from "@/components/sections/CTABand";

/* Inline social SVGs — lucide-react dropped social icons */
const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);
const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);
const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" />
  </svg>
);

export function generateStaticParams() {
  return DUMMY_BLOG_POSTS.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const post = DUMMY_BLOG_POSTS.find((p) => p.slug === resolvedParams.slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="flex flex-col">
      {/* Article Header */}
      <section className="bg-white pt-24 pb-10">
        <div className="section-container max-w-4xl">
          <ScrollReveal direction="up">
            <Link 
              href="/blog" 
              className="inline-flex items-center text-sm font-semibold text-mt-primary hover:text-mt-primary-dark mb-8"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Blog
            </Link>

            <div className="mb-6 flex flex-wrap items-center gap-4">
              <Badge variant="default" className="bg-mt-primary-bg text-mt-primary-dark hover:bg-mt-primary/20">
                {post.category}
              </Badge>
              <div className="flex items-center gap-4 text-sm text-mt-text-tertiary font-medium">
                <time dateTime={new Date(post.date).toISOString()}>{post.date}</time>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{post.readTime}</span>
                </div>
              </div>
            </div>

            <h1 className="font-display text-heading-xl sm:text-display-lg text-mt-text mb-8">
              {post.title}
            </h1>

            <div className="flex items-center justify-between border-y border-mt-border py-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-mt-primary/20">
                  <img
                    src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=150&auto=format&fit=crop"
                    alt={BRAND.doctor}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-bold text-mt-text">{BRAND.doctor}</div>
                  <div className="text-sm text-mt-text-secondary">{BRAND.qualification}</div>
                </div>
              </div>

              {/* Social Share */}
              <div className="hidden sm:flex items-center gap-3">
                <span className="text-sm font-medium text-mt-text-secondary mr-2 flex items-center gap-2">
                  <Share2 className="h-4 w-4" /> Share
                </span>
                <button className="h-8 w-8 rounded-full bg-mt-bg flex items-center justify-center text-mt-text-tertiary hover:bg-mt-primary-bg hover:text-mt-primary transition-colors">
                  <TwitterIcon className="h-4 w-4" />
                </button>
                <button className="h-8 w-8 rounded-full bg-mt-bg flex items-center justify-center text-mt-text-tertiary hover:bg-mt-primary-bg hover:text-mt-primary transition-colors">
                  <FacebookIcon className="h-4 w-4" />
                </button>
                <button className="h-8 w-8 rounded-full bg-mt-bg flex items-center justify-center text-mt-text-tertiary hover:bg-mt-primary-bg hover:text-mt-primary transition-colors">
                  <LinkedinIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Featured Image */}
      <section className="bg-white pb-12">
        <div className="section-container max-w-5xl">
          <ScrollReveal direction="up" delay={0.2} className="relative aspect-[21/9] w-full overflow-hidden rounded-2xl shadow-lg">
            <img
              src={post.image}
              alt={post.title}
              className="h-full w-full object-cover"
            />
          </ScrollReveal>
        </div>
      </section>

      {/* Article Content */}
      <section className="bg-white pb-24">
        <div className="section-container max-w-3xl">
          <ScrollReveal direction="up" className="prose prose-lg prose-mt-primary max-w-none">
            <p className="lead text-xl text-mt-text-secondary font-medium mb-8">
              {post.excerpt}
            </p>
            
            <p>
              In conventional medicine, the focus is often placed squarely on the localized symptoms 
              of a disease. However, in classical homeopathy, we understand that symptoms are merely 
              the body&apos;s alarm bells—signals that the vital force or internal equilibrium has been disrupted.
            </p>
            
            <h2>Understanding the Constitutional Approach</h2>
            <p>
              When a patient presents with chronic issues, whether it be severe anxiety, hormonal imbalances 
              like PCOD, or persistent insomnia, the approach is never one-size-fits-all. Ten different patients 
              with the same medical diagnosis may receive ten completely different homeopathic remedies.
            </p>
            <p>
              Why? Because the <em>manifestation</em> of the disease is unique to each individual&apos;s constitution.
            </p>
            
            <blockquote>
              &ldquo;The highest ideal of cure is rapid, gentle and permanent restoration of the health, or removal and 
              annihilation of the disease in its whole extent, in the shortest, most reliable, and most harmless way.&rdquo; 
              — Samuel Hahnemann
            </blockquote>
            
            <h3>The Role of Stress and Lifestyle</h3>
            <p>
              While homeopathic remedies act as a catalyst to stimulate the body&apos;s self-healing mechanism, 
              they work best when supported by a balanced lifestyle. Managing stress through mindfulness, 
              ensuring adequate sleep hygiene, and maintaining a diet that supports your specific hormonal 
              needs are crucial pillars of the healing journey.
            </p>

            <ul>
              <li>Identify and mitigate environmental stressors where possible.</li>
              <li>Establish a consistent sleep schedule to support circadian rhythms.</li>
              <li>Focus on whole, unprocessed foods to reduce systemic inflammation.</li>
            </ul>

            <p>
              True healing is a journey. It requires patience, careful observation, and a partnership 
              between the physician and the patient. By addressing the root cause rather than merely 
              suppressing the symptoms, we pave the way for lasting health and vitality.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <CTABand />
    </div>
  );
}
