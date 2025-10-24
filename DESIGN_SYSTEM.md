# 🎨 OrderWeb.net - Design System Documentation

## Typography (Fonts)

### Primary Font
**Font Family:** `Alegreya`  
**Type:** Serif  
**Usage:** Body text, headings, and all content throughout the application

```css
body {
  font-family: 'Alegreya', serif;
}
```

**Fallback Stack:**
```css
font-family: 'Alegreya', 'ui-sans-serif', 'system-ui', 'sans-serif';
```

---

## 🎨 Color Palette

### Light Theme (Default)

#### Primary Colors
| Color | HSL Value | Hex Equivalent | Usage |
|-------|-----------|----------------|-------|
| **Primary** | `224° 82% 57%` | `#4A90E2` (Medium Blue) | Main brand color, buttons, links |
| **Primary Foreground** | `210° 40% 98%` | `#F7FAFC` (Almost White) | Text on primary color |
| **Background** | `210° 40% 98%` | `#F7FAFC` (Light Blue-Gray) | Main background |
| **Foreground** | `222° 84% 5%` | `#020817` (Almost Black) | Main text color |

#### Secondary Colors
| Color | HSL Value | Hex Equivalent | Usage |
|-------|-----------|----------------|-------|
| **Secondary** | `210° 100% 97%` | `#E3F2FD` (Light Blue) | Pending status, secondary elements |
| **Secondary Foreground** | `210° 90% 45%` | `#0D47A1` (Dark Blue) | Text on secondary |

#### Status Colors
| Color | HSL Value | Hex Equivalent | Usage |
|-------|-----------|----------------|-------|
| **Success** | `140° 80% 96%` | `#E8F5E9` (Light Green) | Success messages, delivered status |
| **Success Foreground** | `140° 70% 30%` | `#1B5E20` (Dark Green) | Text on success |
| **Destructive** | `350° 100% 97%` | `#FFEBEE` (Light Red) | Error messages, cancelled status |
| **Destructive Foreground** | `350° 90% 45%` | `#C62828` (Dark Red) | Text on destructive |

#### UI Colors
| Color | HSL Value | Hex Equivalent | Usage |
|-------|-----------|----------------|-------|
| **Card** | `0° 0% 100%` | `#FFFFFF` (White) | Card backgrounds |
| **Muted** | `210° 40% 96%` | `#F1F5F9` (Very Light Gray) | Muted backgrounds |
| **Accent** | `210° 40% 94%` | `#E2E8F0` (Light Gray) | Accent elements |
| **Border** | `214° 32% 91%` | `#E2E8F0` (Light Border) | Borders and dividers |
| **Input** | `214° 32% 91%` | `#E2E8F0` (Light Gray) | Input backgrounds |
| **Ring** | `221° 83% 53%` | `#3B82F6` (Blue) | Focus rings |

#### Sidebar Colors
| Color | HSL Value | Usage |
|-------|-----------|-------|
| **Sidebar Background** | `0° 0% 100%` (White) | Sidebar background |
| **Sidebar Foreground** | `222° 84% 5%` (Almost Black) | Sidebar text |
| **Sidebar Primary** | `221° 83% 53%` (Blue) | Active items |
| **Sidebar Border** | `214° 32% 91%` (Light Gray) | Sidebar borders |

---

### Dark Theme

#### Primary Colors
| Color | HSL Value | Hex Equivalent | Usage |
|-------|-----------|----------------|-------|
| **Primary** | `224° 82% 67%` | `#60A5FA` (Lighter Blue) | Main brand color in dark mode |
| **Primary Foreground** | `222° 47% 11%` | `#0F172A` (Very Dark Blue) | Text on primary |
| **Background** | `222° 84% 5%` | `#020817` (Very Dark Blue) | Main background |
| **Foreground** | `210° 40% 98%` | `#F7FAFC` (Almost White) | Main text color |

#### Secondary Colors
| Color | HSL Value | Hex Equivalent | Usage |
|-------|-----------|----------------|-------|
| **Secondary** | `217° 33% 18%` | `#1E293B` (Dark Blue-Gray) | Secondary elements |
| **Muted** | `217° 33% 18%` | `#1E293B` (Dark Blue-Gray) | Muted backgrounds |

#### Status Colors
| Color | HSL Value | Usage |
|-------|-----------|-------|
| **Success** | `140° 90% 15%` (Dark Green) | Success in dark mode |
| **Destructive** | `350° 90% 15%` (Dark Red) | Error in dark mode |

---

## 📐 Spacing & Border Radius

### Border Radius
```css
--radius: 0.75rem; /* 12px - Default rounded corners */

/* Variants */
lg: 0.75rem     /* Large radius */
md: 0.5rem      /* Medium radius (radius - 2px) */
sm: 0.25rem     /* Small radius (radius - 4px) */
```

---

## 🎭 Common Color Combinations Used

### Admin Dashboard
- **Background:** Light Blue-Gray (`#F7FAFC`)
- **Cards:** White (`#FFFFFF`)
- **Primary Actions:** Blue (`#4A90E2`)
- **Text:** Almost Black (`#020817`)

### Status Badges
```
✅ Active/Delivered:  Green (#1B5E20 on #E8F5E9)
⏳ Pending:          Blue (#0D47A1 on #E3F2FD)
❌ Cancelled:        Red (#C62828 on #FFEBEE)
⚪ Inactive:         Gray (#64748B on #F1F5F9)
```

### POS Integration Page
```
🟢 WebSocket Active:     Green gradient (#10B981)
🔵 API Section:          Blue gradient (#3B82F6)
🟡 Security Section:     Yellow/Amber (#FBBF24)
🟣 Configuration:        Purple gradient (#8B5CF6)
```

### Buttons
```
Primary:         bg-blue-600 hover:bg-blue-700 (#2563EB → #1D4ED8)
Secondary:       bg-gray-200 hover:bg-gray-300 (#E5E7EB → #D1D5DB)
Success:         bg-green-600 hover:bg-green-700 (#059669 → #047857)
Danger:          bg-red-600 hover:bg-red-700 (#DC2626 → #B91C1C)
```

---

## 🌈 Extended Color Usage

### Gradients
```css
/* Primary Blue Gradient */
background: linear-gradient(to right, #4A90E2, #1E40AF);

/* Success Green */
from-green-50 to-emerald-50

/* Info Blue */
from-blue-50 to-indigo-50

/* Warning Amber */
from-yellow-50 to-amber-50
```

### Specific Component Colors

#### Gift Cards
- **Section Background:** `bg-purple-50`
- **Icon Color:** `text-purple-600`
- **Border:** `border-purple-300`

#### Orders
- **New Order:** `bg-green-50 border-green-300`
- **Pending:** `bg-blue-50 border-blue-300`
- **Cancelled:** `bg-red-50 border-red-300`

#### Loyalty Points
- **Star Icon:** `text-yellow-500`
- **Points Badge:** `bg-purple-100 text-purple-700`
- **Section Background:** `bg-amber-50`

#### WebSocket Connection
- **Connected:** `bg-green-500 animate-pulse`
- **Disconnected:** `bg-red-500`
- **Connecting:** `bg-yellow-500`

---

## 📊 Chart Colors

Used in analytics and reporting:
```
Chart 1: #3B82F6 (Blue)
Chart 2: #60A5FA (Light Blue)
Chart 3: #F1F5F9 (Light Gray)
Chart 4: #64748B (Gray)
Chart 5: #0F172A (Dark Blue)
```

---

## 💡 Design Principles

### Typography
- **Font:** Alegreya (Serif) - Professional, elegant, and readable
- **Sizes:** Responsive using Tailwind's text sizing (text-sm to text-4xl)

### Colors
- **Primary Palette:** Blue shades - Trust, reliability, technology
- **Status Colors:** Green (success), Blue (pending), Red (error/cancelled)
- **Backgrounds:** Light blue-gray for reduced eye strain
- **Contrast:** High contrast ratios for accessibility (WCAG AA compliant)

### Spacing
- Consistent padding and margins using Tailwind's spacing scale
- Cards: `p-6` (1.5rem/24px)
- Sections: `mb-6` (1.5rem/24px)
- Containers: `max-w-4xl` or `max-w-6xl`

---

## 🎨 Quick Reference - Common Classes

```tsx
// Headings
<h1 className="text-3xl font-bold text-gray-900">

// Body Text
<p className="text-base text-gray-600">

// Cards
<div className="bg-white rounded-lg shadow-lg p-6">

// Primary Button
<button className="bg-blue-600 hover:bg-blue-700 text-white">

// Success Badge
<span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">

// Border
<div className="border border-gray-200 rounded-lg">

// Input
<input className="border border-gray-300 rounded-md p-3 bg-gray-50">
```

---

## 📱 Responsive Design

All colors and fonts are consistent across breakpoints:
- Mobile: `sm:` (640px)
- Tablet: `md:` (768px)
- Desktop: `lg:` (1024px)
- Large: `xl:` (1280px)
- Extra Large: `2xl:` (1400px max)

---

**Design System maintained with:**
- **Tailwind CSS** for utility classes
- **CSS Variables** for dynamic theming
- **shadcn/ui** for component library
