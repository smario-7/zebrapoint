import { motion, useReducedMotion } from "framer-motion";

const pageVariants = {
  initial: (reduced) => ({
    opacity: 1,
    filter: reduced ? "none" : "blur(10px)",
  }),
  animate: {
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.28,
      ease: [0.2, 0, 0, 1],
    },
  },
  exit: (reduced) => ({
    opacity: 1,
    filter: reduced ? "none" : "blur(10px)",
    transition: {
      duration: 0.18,
      ease: [0.2, 0, 0, 1],
    },
  }),
};

export default function RouteTransition({ children }) {
  const reduced = useReducedMotion();
  const MotionDiv = motion.div;

  return (
    <MotionDiv
      custom={reduced}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="absolute inset-0 w-full bg-[var(--zp-app-bg)]"
    >
      {children}
    </MotionDiv>
  );
}

