import { useState, useEffect, useRef } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp, BookOpen, Music, Headphones, Mic2, ArrowRight, Sparkles, Check } from 'lucide-react';

const features = [
  {
    title: "Interactive Lessons",
    description: "Master music theory through hands-on, interactive exercises",
    icon: <BookOpen className="w-5 h-5 text-primary" />
  },
  {
    title: "Song Analysis",
    description: "Break down your favorite songs and understand their structure",
    icon: <Music className="w-5 h-5 text-primary" />
  },
  {
    title: "Ear Training",
    description: "Develop your musical ear with guided listening exercises",
    icon: <Headphones className="w-5 h-5 text-primary" />
  },
  {
    title: "Vocal Training",
    description: "Improve your singing with professional vocal exercises",
    icon: <Mic2 className="w-5 h-5 text-primary" />
  }
];

export default function LearnModule() {
  const [showTutors, setShowTutors] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const tutorsSectionRef = useRef<HTMLDivElement>(null);
  const { showSuccess } = useNotifications();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="overflow-hidden">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8 max-w-6xl"
    >
      {/* Hero Section */}
      <motion.div 
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/5 to-primary/10 p-8 md:p-12 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/20 to-transparent opacity-50"></div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary mb-4">
            <Sparkles className="w-4 h-4 mr-2" />
            Coming Soon
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
            Elevate Your <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Musical Journey</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            We're crafting an immersive learning experience with interactive lessons, expert guidance, and personalized feedback to help you master your instrument.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button 
              size="lg" 
              className="group"
              onClick={() => {
                emailInputRef.current?.scrollIntoView({ behavior: 'smooth' });
                // Small delay to ensure the input is visible before focusing
                setTimeout(() => {
                  emailInputRef.current?.focus();
                }, 500);
              }}
            >
              Get Notified
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => {
                // First ensure the tutors section is expanded
                setShowTutors(true);
                // Then scroll to it after a small delay to allow for expansion
                setTimeout(() => {
                  tutorsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
            >
              Learn More
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="group"
          >
            <Card className="h-full transition-all duration-300 hover:shadow-lg hover:border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tutors Section */}
      <motion.div 
        ref={tutorsSectionRef}
        className="bg-card rounded-2xl border border-border overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div 
          className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-accent/30 transition-colors"
          onClick={() => setShowTutors(!showTutors)}
        >
          <div>
            <h2 className="text-xl font-semibold text-foreground">Meet Our Expert Tutors</h2>
            <p className="text-sm text-muted-foreground">Learn from the best in the industry</p>
          </div>
          <Button variant="ghost" size="icon">
            {showTutors ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            <span className="sr-only">Toggle tutors</span>
          </Button>
        </div>
        
        <AnimatePresence>
          {showTutors && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-2 sm:px-4 md:px-6 pt-0 pb-6">
                <motion.div 
                  className="space-y-6 px-2 sm:px-0"
                  initial="hidden"
                  animate={showTutors ? "show" : "hidden"}
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.1,
                        delayChildren: 0.1
                      }
                    }
                  }}
                >
                  <motion.div 
                    className="relative overflow-hidden group rounded-xl mt-4"
                    whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: { 
                        opacity: 1, 
                        y: 0,
                        transition: {
                          type: "spring",
                          stiffness: 100,
                          damping: 10
                        }
                      }
                    }}
                    onClick={() => setSelectedTutor(selectedTutor === 'mark' ? null : 'mark')}
                  >
                    <div className={`absolute -inset-0.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-blue-600 rounded-xl ${selectedTutor === 'mark' ? 'opacity-70' : 'opacity-0 group-hover:opacity-70'} blur transition-all duration-300`}></div>
                    <div className={`relative flex flex-col sm:flex-row items-center p-3 sm:p-4 bg-background/90 rounded-xl shadow-sm hover:shadow-md transition-all`}>
                    <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-primary/20">
                      <img 
                        src="https://scontent.fcrk1-4.fna.fbcdn.net/v/t39.30808-1/504142903_10011454185634347_1918103565945494277_n.jpg?stp=dst-jpg_s200x200_tt6&_nc_cat=102&ccb=1-7&_nc_sid=e99d92&_nc_eui2=AeHG4oZW0fgOpRgL4dEQgi4JCik3mQDtSo0KKTeZAO1KjTHFWFeN8TjW2dsI97aq4AZwdyblTre2OCI8PTiCIiSk&_nc_ohc=-ibF0PRimzkQ7kNvwHzfkwK&_nc_oc=AdnUc1Fn0pTzi0QkBgqqtJ6d0tOCuMEYaHL1zxFGm4mWdqp7pZ756XkUSNfppCG9DkU&_nc_zt=24&_nc_ht=scontent.fcrk1-4.fna&_nc_gid=pxBNahhm7xB0uxKehJaJFw&oh=00_AfZIVJhocNGGAMCHzByYpy-ZRcWSnJs9tyQDh7MzeUoMJw&oe=68E271C7" 
                        alt="Mark Edward Andres"
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM4ODgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjAgMjF2LTJhNCA0IDAgMCAwLTQtNEg4YTIgMiAwIDAgMS0yLTJWN2E0IDQgMCAwIDEgNC00aDhhNCA0IDAgMCAxIDQgNHYxMCI+PC9wYXRoPjxwYXRoIGQ9Ik0xMiAxMWEyIDIgMCAxIDAtMC0yYTIgMiAwIDAgMCAwIDR6bTAgMHYxYTIgMiAwIDAgMS0yIDJIOGEyIDIgMCAwIDAtMiAydjEiPjwvcGF0aD48L3N2Zz4=';
                        }}
                      />
                    </div>
                    <div className="ml-0 sm:ml-4 md:ml-6 text-center sm:text-left mt-3 sm:mt-0">
                      <h4 className="font-semibold text-lg text-foreground">Mark Edward Andres</h4>
                      <p className="text-sm text-muted-foreground mb-2">Guitar & Music Theory Instructor</p>
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          12+ Years Experience
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500 text-white dark:bg-blue-900/30 dark:text-blue-300">
                          2000+ Students
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500 text-white dark:bg-green-900/30 dark:text-green-300">
                          <Check className="mr-1 h-4 w-4" /> Available Now!
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full sm:w-auto mt-4 sm:mt-0 sm:ml-auto border-0 hover:bg-accent/50 px-3 text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        showSuccess('Coming Soon!', 'Schedule Session feature is coming soon!');
                      }}
                    >
                      Schedule Session
                    </Button>
                    </div>
                  </motion.div>

                  {/* Tutor: Lara Eunique Viernes */}
                  <motion.div 
                    className="relative overflow-hidden group mt-6 rounded-xl"
                    whileHover={{ scale: 1.01 }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    onClick={() => setSelectedTutor(selectedTutor === 'lara' ? null : 'lara')}
                  >
                    <div className={`absolute -inset-0.5 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-xl ${selectedTutor === 'lara' ? 'opacity-70' : 'opacity-0 group-hover:opacity-70'} blur transition-all duration-300`}></div>
                    <div className={`relative flex flex-col sm:flex-row items-center p-4 bg-background/90 rounded-xl shadow-sm hover:shadow-md transition-all`}>
                    <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-primary/20">
                      <img 
                        src="https://scontent.fcrk1-2.fna.fbcdn.net/v/t39.30808-1/514551727_703991865750998_2643225441744712044_n.jpg?stp=dst-jpg_s200x200_tt6&_nc_cat=108&ccb=1-7&_nc_sid=e99d92&_nc_eui2=AeFCTTcbSBj2Q-9lIq1pYmlyMg0GgnO2vw8yDQaCc7a_D4FKzWfBcyppRuuJgLDTvs7cpnqQVL6D9bxJuO9Llr2O&_nc_ohc=OMV26K665u4Q7kNvwF2OJMu&_nc_oc=Adkh1KdvOS43FKDp2693VVsAlQNf0gpTd2TmoJ-thizm9ChLpI9Qtw7BfQEyZ-qugsw&_nc_zt=24&_nc_ht=scontent.fcrk1-2.fna&_nc_gid=AVVsHKBzhPY4wkYO1yRMzw&oh=00_AfZppgj-wM7jS4-1P1VTzi8j9lLXATBdq1PqHRftZ65_ow&oe=68E28B4A"
                        alt="Lara Eunique Viernes"
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM4ODgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjAgMjF2LTJhNCA0IDAgMCAwLTQtNEg4YTIgMiAwIDAgMS0yLTJWN2E0IDQgMCAwIDEgNC00aDhhNCA0IDAgMCAxIDQgNHYxMCI+PC9wYXRoPjxwYXRoIGQ9Ik0xMiAxMWEyIDIgMCAxIDAtMC0yYTIgMiAwIDAgMCAwIDR6bTAgMXYxYTIgMiAwIDAgMS0yIDJIOGEyIDIgMCAwIDAtMiAydjEiPjwvcGF0aD48L3N2Zz4=';
                        }}
                      />
                    </div>
                    <div className="ml-0 sm:ml-4 md:ml-6 text-center sm:text-left mt-3 sm:mt-0">
                      <h4 className="font-semibold text-lg text-foreground">Lara Eunique Viernes</h4>
                      <p className="text-sm text-muted-foreground mb-2">Piano & Vocal Coach</p>
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          7+ Years Experience
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500 text-white dark:bg-blue-900/30 dark:text-blue-300">
                          707+ Students
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500 text-white dark:bg-green-900/30 dark:text-green-300">
                          <Check className="mr-1 h-4 w-4" /> Available Now!
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full sm:w-auto mt-4 sm:mt-0 sm:ml-auto border-0 hover:bg-accent/50 px-3 text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        showSuccess('Coming Soon!', 'Schedule Session feature is coming soon!');
                      }}
                    >
                      Schedule Session
                    </Button>
                    </div>
                  </motion.div>

                  {/* Tutor: Your Ways Jeder */}
                  <motion.div 
                    className="relative overflow-hidden group mt-6 rounded-xl"
                    whileHover={{ scale: 1.01 }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    onClick={() => setSelectedTutor(selectedTutor === 'jeder' ? null : 'jeder')}
                  >
                    <div className={`absolute -inset-0.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-xl ${selectedTutor === 'jeder' ? 'opacity-70' : 'opacity-0 group-hover:opacity-70'} blur transition-all duration-300`}></div>
                    <div className={`relative flex flex-col sm:flex-row items-center p-4 bg-background/90 rounded-xl shadow-sm hover:shadow-md transition-all`}>
                    <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-primary/20">
                      <div className="w-full h-full bg-amber-100 flex items-center justify-center text-amber-800 text-2xl font-bold">
                        Eh!
                      </div>
                    </div>
                    <div className="ml-0 sm:ml-4 md:ml-6 text-center sm:text-left mt-3 sm:mt-0">
                      <h4 className="font-semibold text-lg text-foreground">Your Ways Jeder</h4>
                      <p className="text-sm text-muted-foreground mb-2">Drums & Rhythm Instructor</p>
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          5+ Years Experience
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500 text-white dark:bg-blue-900/30 dark:text-blue-300">
                          800+ Students
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500 text-white dark:bg-yellow-900/30 dark:text-yellow-300">
                          Limited Availability
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full sm:w-auto mt-4 sm:mt-0 sm:ml-auto border-0 hover:bg-accent/50 px-3 text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        showSuccess('Coming Soon!', 'Schedule Session feature is coming soon!');
                      }}
                    >
                      Schedule Session
                    </Button>
                    </div>
                  </motion.div>
                </motion.div>
                <div className="mt-6 text-center">
                  {/* <Button variant="ghost" className="text-primary">
                    Add
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button> */}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* CTA Section */}
      <motion.div 
        id="cta-section"
        className="pt-16 pb-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h2 className="text-2xl font-bold text-foreground mb-4">Ready to Start Learning?</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
          Join our waiting list to be the first to know when we launch our comprehensive music learning platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <input 
              ref={emailInputRef}
              type="email" 
              placeholder="Enter your email" 
              className="px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent flex-1 min-w-0"
              onFocus={(e) => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            />
          <Button 
            className="whitespace-nowrap"
            onClick={() => tutorsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          >
            Join Waitlist
          </Button>
        </div>
      </motion.div>
    </motion.div>
    </div>
  );
}
