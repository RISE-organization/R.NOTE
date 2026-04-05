import React from 'react';
import { motion, Variants } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variants?: Variants;
}

const Card: React.FC<CardProps> = ({ children, className = '', onClick, variants }) => {
  return (
    <motion.div
      className={`relative overflow-hidden rounded-3xl p-4 md:p-6 shadow-2xl backdrop-blur-2xl bg-white/60 dark:bg-slate-800/60 border border-white/30 dark:border-slate-700/30 ${className}`}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      variants={variants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};

export default Card;