'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const locations = [
  {
    name: 'Mumbai',
    image: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?q=80&w=800&auto=format&fit=crop',
    count: '150+ Cars',
  },
  {
    name: 'Pune',
    image: 'https://images.unsplash.com/photo-1569317002804-ab77bcf1bce4?q=80&w=800&auto=format&fit=crop',
    count: '120+ Cars',
  },
  {
    name: 'Bangalore',
    image: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?q=80&w=800&auto=format&fit=crop',
    count: '100+ Cars',
  },
  {
    name: 'Hyderabad',
    image: 'https://images.unsplash.com/photo-1572445271230-a78b5944a659?q=80&w=800&auto=format&fit=crop',
    count: '80+ Cars',
  },


];

export default function Locations() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            Popular Locations
          </h2>
          <p className="text-gray-400 text-lg">Find your dream car in your city</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {locations.map((location, index) => (
            <motion.div
              key={location.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -10 }}
              className="group relative h-60 w-53  rounded-2xl overflow-hidden cursor-pointer shadow-2xl"
            >
              {/* Background Image */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                style={{ backgroundImage: `url(${location.image})` }}
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <h3 className="text-2xl font-bold text-white mb-2 transform translate-y-0 transition-transform duration-300">
                  {location.name}
                </h3>
                <p className="text-cyan-400 font-medium opacity-100 transition-opacity duration-300">
                  {location.count}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/locations">
            <button className="px-8 py-4 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105 flex items-center gap-2 mx-auto">
              View All Locations
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
