import { BRAND } from "../../lib/constants";
import { DUMMY_ABOUT as FULL_ABOUT } from "../../lib/dummy-data";
import Image from "next/image";
import Link from "next/link";
import { Award, BookOpen, GraduationCap, Users } from "lucide-react";
import ReactMarkdown from "react-markdown";
import ScrollReveal from "../../components/ui/ScrollReveal";
import { Button } from "../../components/ui/Button";

export default function AboutPage() {
  const stats = [
    { label: "Years Experience", value: "5+", icon: Award },
    { label: "Patients Treated", value: "3,000+", icon: Users },
    { label: "Success Rate", value: "94%", icon: BookOpen },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-mt-primary pt-24 pb-32 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay" />
        <div className="absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t from-mt-bg to-transparent" />
        
        <div className="section-container relative z-10 text-center">
          <ScrollReveal direction="up">
            <h1 className="font-display text-display-lg sm:text-display-xl mb-6">
              About {BRAND.doctor}
            </h1>
            <p className="mx-auto max-w-2xl text-body-lg text-mt-primary-bg opacity-90">
              {BRAND.qualification} | Founder of {BRAND.name}
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Main Biography */}
      <section className="section-padding -mt-20 relative z-20">
        <div className="section-container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Left Column: Image & Stats */}
            <div className="lg:col-span-5 flex flex-col gap-8">
              <ScrollReveal direction="up" delay={0.2}>
                <div className="glass-card overflow-hidden p-2 shadow-2xl">
                  <div className="aspect-[4/5] overflow-hidden rounded-xl relative">
                    <Image
                      src="/images/dr-aman.jpg"
                      alt={BRAND.doctor}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/60 to-transparent p-6 text-white">
                      <div className="font-display text-xl font-bold">{BRAND.doctor}</div>
                      <div className="text-sm opacity-90">{BRAND.qualification}</div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
                {stats.map((stat, i) => (
                  <ScrollReveal key={stat.label} direction="up" delay={0.3 + (i * 0.1)}>
                    <div className="flex items-center gap-4 rounded-2xl border border-mt-border bg-white p-5 shadow-sm">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mt-primary-bg text-mt-primary">
                        <stat.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="font-display text-2xl font-bold text-mt-text">{stat.value}</div>
                        <div className="text-sm font-medium text-mt-text-secondary">{stat.label}</div>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>

            {/* Right Column: Text Content */}
            <div className="lg:col-span-7">
              <ScrollReveal direction="up" delay={0.4} className="prose prose-lg prose-mt-primary max-w-none">
                <h2 className="font-display text-heading-lg text-mt-text mb-6">
                  My Healing Philosophy
                </h2>
                
                {/* Render the actual Markdown content from the dummy-data */}
                <div className="mt-text-secondary prose-h2:font-display prose-h2:text-mt-text prose-h2:text-heading-lg prose-h3:font-display prose-a:text-mt-primary">
                  <ReactMarkdown>
                    {FULL_ABOUT}
                  </ReactMarkdown>
                </div>

                <div className="mt-12 rounded-2xl bg-mt-secondary/10 p-8 border border-mt-secondary/20">
                  <h3 className="font-display text-heading-sm text-mt-text mb-4">Credentials</h3>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <GraduationCap className="h-6 w-6 shrink-0 text-mt-secondary" />
                      <div>
                        <div className="font-semibold text-mt-text">Bachelor of Homeopathic Medicine and Surgery (BHMS)</div>
                        <div className="text-sm text-mt-text-secondary">Gold Medalist, 2021</div>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <Award className="h-6 w-6 shrink-0 text-mt-secondary" />
                      <div>
                        <div className="font-semibold text-mt-text">Advanced Diploma in Psychological Counseling</div>
                        <div className="text-sm text-mt-text-secondary">Specialization in Anxiety & Depression</div>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="mt-12">
                  <Button asChild size="lg">
                    <Link href="/book-consultation">Consult with Dr. Aman</Link>
                  </Button>
                </div>
              </ScrollReveal>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
