// Register GSAP ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

// 1. HERO PARALLAX EFFECT
// Background moves slower than text during scroll
gsap.to("#hero-bg", {
  yPercent: 30,
  ease: "none",
  scrollTrigger: {
    trigger: ".hero-section",
    start: "top top",
    end: "bottom top",
    scrub: true,
  },
});

gsap.to("#hero-text", {
  yPercent: 50,
  opacity: 0,
  ease: "none",
  scrollTrigger: {
    trigger: ".hero-section",
    start: "top top",
    end: "80% top",
    scrub: true,
  },
});

// 2. PRODUCT CARDS STAGGERED FADE-UP ON SCROLL
gsap.from(".scroll-reveal", {
  y: 80,
  opacity: 0,
  duration: 1.2,
  stagger: 0.2,
  ease: "power3.out",
  scrollTrigger: {
    trigger: ".products-section",
    start: "top 75%",
    toggleActions: "play none none reverse",
  },
});

// 3. FEATURED SHOWCASE SCROLL REVEAL
gsap.from("#showcase-img", {
  x: -100,
  opacity: 0,
  duration: 1.4,
  ease: "power3.out",
  scrollTrigger: {
    trigger: ".featured-showcase",
    start: "top 70%",
  },
});

gsap.from("#showcase-text", {
  x: 100,
  opacity: 0,
  duration: 1.4,
  ease: "power3.out",
  scrollTrigger: {
    trigger: ".featured-showcase",
    start: "top 70%",
  },
});
