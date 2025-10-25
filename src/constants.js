// src/constants.js
import {
  Apple, // Fruits
  Milk, // Dairy
  Beef, // Meat & Egg
  Fish, // Seafood
  Wheat, // Staples / Bakery
  Vegan, // Vegetables
  GlassWater, // Beverages
  CookingPot, // Spices / Staples
  Cookie, // Snacks
  ShoppingCart, // Other
  SprayCan, // Household
  Sparkles, // Personal Care
  Package, // General Packaging
  PlusSquare,
  HouseHeart,
  Carrot,
  Croissant, // Add icon
} from 'lucide-react';

// Sorted Categories with Icons
export const CATEGORIES = [
  { name: 'Bakery', icon: Croissant },
  { name: 'Beverages', icon: GlassWater },
  { name: 'Dairy', icon: Milk },
  { name: 'Fruits', icon: Apple },
  { name: 'Household', icon: HouseHeart },
  { name: 'Meat & Egg', icon: Beef },
  { name: 'Other', icon: ShoppingCart },
  { name: 'Personal Care', icon: Sparkles },
  { name: 'Seafood', icon: Fish },
  { name: 'Snacks', icon: Cookie },
  { name: 'Spices', icon: CookingPot },
  { name: 'Staples', icon: Wheat }, // Re-using Wheat, consider a different one if available
  { name: 'Vegetables', icon: Carrot },
].sort((a, b) => a.name.localeCompare(b.name)); // Ensure alphabetical sorting

// Default Units
export const UNITS = [
  'pcs', 'g', 'kg', 'ml', 'L', 'pack', 'dozen',
  // Additional suggestions:
  'can', 'bottle', 'box', 'bunch', 'roll', 'jar', 'bag',
].sort(); // Sort units alphabetically

// Helper to get icon by category name
export const getCategoryIcon = (categoryName) => {
  const category = CATEGORIES.find(c => c.name === categoryName);
  return category ? category.icon : ShoppingCart; // Default to 'Other' icon
};
