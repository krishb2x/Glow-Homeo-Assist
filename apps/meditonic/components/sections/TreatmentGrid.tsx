import { Activity, Brain, Flame, Heart, Moon, Sparkles } from "lucide-react";
import Link from "next/link";
import { TREATMENT_CATEGORIES } from "../../lib/constants";
import ScrollReveal from "../../components/ui/ScrollReveal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

// Map lucide icons to treatment categories dynamically
const ICON_MAP: Record<string, any> = {
  Brain: Brain,
  Moon: Moon,
  Flame: Flame,
  Heart: Heart,
  Activity: Activity,
  Sparkles: Sparkles,
};

export default function TreatmentGrid() {
  return (
    <section className="section-padding bg-white" id="treatments">
      <div className="section-container">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-heading-xl text-mt-text sm:text-display-lg">
            Conditions We Treat
          </h2>
          <p className="mt-4 text-body-lg text-mt-text-secondary">
            Experience a holistic approach that treats the root cause of mental 
            and hormonal imbalances, not just the symptoms.
          </p>
        </ScrollReveal>

        <div className="mt-12 sm:mt-16 grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TREATMENT_CATEGORIES.map((category, index) => {
            const Icon = ICON_MAP[category.icon] || Sparkles;

            return (
              <ScrollReveal 
                key={category.slug} 
                delay={0.1 * (index + 1)}
                direction="up"
              >
                <Card hover className="flex h-full flex-col">
                  <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                    <div className="mb-3 sm:mb-4 inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-mt-primary-bg text-mt-primary">
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <CardTitle className="text-sm sm:text-xl leading-tight">{category.title}</CardTitle>
                    <CardDescription className="hidden sm:block mt-2 text-base leading-relaxed">
                      {category.shortDesc}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="hidden sm:block flex-1 p-6 pt-0">
                    <ul className="flex flex-col gap-2 text-sm text-mt-text-secondary">
                      {category.conditions.slice(0, 3).map((condition) => (
                        <li key={condition} className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-mt-secondary shrink-0" />
                          <span className="line-clamp-1">{condition}</span>
                        </li>
                      ))}
                      {category.conditions.length > 3 && (
                        <li className="text-mt-text-tertiary text-xs italic mt-1">
                          + {category.conditions.length - 3} more
                        </li>
                      )}
                    </ul>
                  </CardContent>
                  <CardFooter className="p-4 sm:p-6 pt-2 sm:pt-4 sm:border-t border-mt-border/50 mt-auto">
                    <Button asChild variant="ghost" className="w-full justify-between px-0 hover:bg-transparent h-auto py-1">
                      <Link href={`/treatments/${category.slug}`} className="text-xs sm:text-sm font-semibold">
                        Learn more
                        <span className="text-mt-primary ml-1">&rarr;</span>
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              </ScrollReveal>
            );
          })}
        </div>

        <ScrollReveal delay={0.4} className="mt-12 text-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/treatments">View All Conditions</Link>
          </Button>
        </ScrollReveal>
      </div>
    </section>
  );
}
