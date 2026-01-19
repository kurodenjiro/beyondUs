"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const images = [
    "/images/carousel/kiddo.svg",
    "/images/carousel/astro.svg",
    "/images/carousel/rogue.svg",
];

export const Carousel = () => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % images.length);
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="relative w-[500px] h-[500px] md:w-[700px] md:h-[700px] mx-auto flex items-center justify-center pointer-events-none select-none">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full animate-pulse" />

            {/* Mask Container */}
            <div className="absolute inset-0 w-full h-full z-10" style={{
                maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)'
            }}>
                <AnimatePresence mode="wait">
                    <motion.img
                        key={images[index]}
                        src={images[index]}
                        alt="Character Preview"
                        initial={{ opacity: 0, scale: 0.9, y: 10, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="absolute w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                    />
                </AnimatePresence>
            </div>
        </div>
    );
};
