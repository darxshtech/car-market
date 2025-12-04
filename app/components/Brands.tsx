'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from "next/image";
import toyotaLogo from "@/app/assets/toyota-logo.png";
import marutiLogo from "@/app/assets/Suzuki-logo.jpg";
import hyundaiLogo from "@/app/assets/hyundai-logo.png";




const brands = [
    {
        name: 'Maruti Suzuki',
        icon: (
            <Image
                src={marutiLogo}
                alt="Maruti Logo"
                width={60}
                height={60}
            />
        ),
        count: '450+',
    },
    {
        name: 'Hyundai',
        icon: (
            <Image
                src={hyundaiLogo}
                alt="Hyudai Logo"
                width={60}
                height={60}
            />
        ),
        count: '320+',
    },
    {
        name: 'Tata',
        icon: (
            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="#2d76b5">
                <path d="M2,11h20v2H2V11z M4,7h16v2H4V7z M6,15h12v2H6V15z" />
            </svg>
        ),
        count: '280+',
    },
    {
        name: 'Mahindra',
        icon: (
            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="#e31837">
                <path d="M4,4h16v16H4V4z M6,16h12V8H6V16z M8,10v4h8v-4H8z" />
            </svg>
        ),
        count: '210+',
    },
    {
        name: "Toyota",
        icon: (
            <Image
                src={toyotaLogo}
                alt="Toyota Logo"
                width={50}
                height={50}
            />
        ),
        count: "150+",
    },
    {
        name: 'Honda',
        icon: (
            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="#e40521">
                <path d="M19,5h-3v14h3V5z M14,5h-4v14h4V5z M8,5H5v14h3V5z" />
            </svg>
        ),
        count: '130+',
    },
];

export default function Brands() {
    return (
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800/30">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Browse by Brands
                    </h2>
                    <p className="text-gray-400 text-lg">Choose from top automotive brands</p>
                </motion.div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                    {brands.map((brand, index) => (
                        <Link key={brand.name} href={`/buy-car?brand=${brand.name}`}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: index * 0.05 }}
                                whileHover={{ y: -5, scale: 1.05 }}
                                className="flex flex-col items-center justify-center p-4 bg-gray-800 rounded-xl border border-gray-700 hover:border-cyan-500 hover:bg-gray-700/50 transition-all duration-300 group cursor-pointer h-full"
                            >
                                <div className="mb-4 transform group-hover:scale-110 transition-transform duration-300">
                                    {brand.icon}
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-1">{brand.name}</h3>
                                <p className="text-sm text-gray-500 group-hover:text-cyan-300 transition-colors">
                                    {brand.count}
                                </p>
                            </motion.div>
                        </Link>
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <Link href="/buy-car">
                        <button className="px-8 py-4 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105 flex items-center gap-2 mx-auto">
                            View All Cars
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </button>
                    </Link>
                </div>
            </div>
        </section>
    );
}
