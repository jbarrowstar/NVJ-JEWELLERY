import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import {
  FaHome,
  FaFileInvoice,
  FaHistory,
  FaUndo,
  FaUsers,
  FaTimes,
  FaBars,
  FaUserShield,
  FaTags,
  FaBoxOpen,
  FaChartBar,
} from 'react-icons/fa';

type SidebarProps = {
  isOpen: boolean;
  toggleSidebar: () => void;
};

export default function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const role = localStorage.getItem('userRole'); // 'admin' or 'staff'

  const staffLinks = [
    { label: 'Home', to: '/dashboard', icon: <FaHome /> },
    { label: 'Billing POS', to: '/billing', icon: <FaFileInvoice /> },
    { label: 'Order History', to: '/orders', icon: <FaHistory /> },
    { label: 'Return Refunds', to: '/returns', icon: <FaUndo /> },
    { label: 'Customers', to: '/customers', icon: <FaUsers /> },
  ];

const adminLinks = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: <FaHome /> },
  { label: 'Billing POS', to: '/admin/billing', icon: <FaFileInvoice /> },
  { label: 'Product Management', to: '/admin/products', icon: <FaBoxOpen /> },
  { label: 'Category Management', to: '/admin/categories', icon: <FaTags /> },
  { label: 'User Management', to: '/admin/users', icon: <FaUserShield /> },
  { label: 'Order History', to: '/admin/orders', icon: <FaHistory /> },
  { label: 'Customers', to: '/admin/customers', icon: <FaUsers /> },
  { label: 'Reports & Analytics', to: '/admin/reports', icon: <FaChartBar /> },
];

  const linksToRender = role === 'admin' ? adminLinks : staffLinks;

  return (
    <div
      className={`fixed top-16 left-0 h-[calc(100vh-4rem)] bg-white shadow-md flex flex-col transition-all duration-300 z-40 ${
        isOpen ? 'w-64' : 'w-16'
      }`}
    >
      {/* 🔘 Sidebar Toggle */}
      <div className="flex justify-end p-4">
        <button
          onClick={toggleSidebar}
          className="text-gray-600 hover:text-yellow-600 text-xl"
        >
          {isOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {/* 📁 Navigation Links */}
      <nav className="flex flex-col gap-4 px-4 text-gray-700">
        {linksToRender.map((link) => (
          <NavItem
            key={link.to}
            icon={link.icon}
            label={link.label}
            to={link.to}
            isOpen={isOpen}
          />
        ))}
      </nav>
    </div>
  );
}

function NavItem({
  icon,
  label,
  to,
  isOpen,
}: {
  icon: JSX.Element;
  label: string;
  to: string;
  isOpen: boolean;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 cursor-pointer hover:text-yellow-600 py-2"
    >
      <div className="text-lg">{icon}</div>
      {isOpen && <span>{label}</span>}
    </Link>
  );
}
