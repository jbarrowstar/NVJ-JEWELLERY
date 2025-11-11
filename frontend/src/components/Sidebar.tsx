import type { JSX } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  FaBuilding,
} from 'react-icons/fa';
import jbLogo from '../assets/jblogo.png';

type SidebarProps = {
  isOpen: boolean;
  toggleSidebar: () => void;
};

export default function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const location = useLocation();
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
    { label: 'Return Refunds', to: '/returns', icon: <FaUndo /> },
    { label: 'Customers', to: '/admin/customers', icon: <FaUsers /> },
    { label: 'Reports & Analytics', to: '/admin/reports', icon: <FaChartBar /> },
  ];

  const linksToRender = role === 'admin' ? adminLinks : staffLinks;

  return (
    <div
      className={`fixed top-16 left-0 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 flex flex-col justify-between transition-all duration-300 z-40 ${
        isOpen ? 'w-64' : 'w-16'
      }`}
    >
      {/* Sidebar Header */}
      <div>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {isOpen && (
            <div className="flex items-center gap-2">
              <FaBuilding className='h-5 w-5 text-gray-800' />
              <span className="text-sm font-semibold text-gray-800">
                {role === 'admin' ? 'Admin Panel' : 'Staff Panel'}
              </span>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 p-1 rounded-lg transition-colors duration-150"
          >
            {isOpen ? <FaTimes className="h-4 w-4" /> : <FaBars className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1 p-3">
          {linksToRender.map((link) => (
            <NavItem
              key={link.to}
              icon={link.icon}
              label={link.label}
              to={link.to}
              isOpen={isOpen}
              isActive={location.pathname === link.to}
            />
          ))}
        </nav>
      </div>

      {/* Footer Branding */}
      <div className={`border-t border-gray-200 ${isOpen ? 'p-4' : 'p-3'}`}>
        {isOpen ? (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <img 
                src={jbLogo} 
                alt="JB Arrowstar" 
                className="h-8 w-8 object-contain"
              />
              <span className="text-xs font-semibold text-gray-700">JB Arrowstar</span>
            </div>
            <p className="text-[10px] text-gray-500 leading-tight">
              Application Created and Service provided by
            </p>
            <p className="text-[10px] font-medium text-gray-700 mt-1">
              JB Arrowstar Solutions Pvt Ltd
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <img 
              src={jbLogo} 
              alt="JB Arrowstar" 
              className="h-8 w-8 object-contain mb-1"
            />
            <span className="text-[8px] font-semibold text-gray-700 text-center leading-tight">
              JBAS
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function NavItem({
  icon,
  label,
  to,
  isOpen,
  isActive,
}: {
  icon: JSX.Element;
  label: string;
  to: string;
  isOpen: boolean;
  isActive: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-150 group ${
        isActive
          ? 'bg-yellow-50 text-yellow-700 border-r-2 border-yellow-600'
          : 'text-gray-600 hover:bg-gray-50 hover:text-yellow-600'
      }`}
    >
      <div className={`text-lg transition-colors duration-150 ${
        isActive ? 'text-yellow-600' : 'text-gray-400 group-hover:text-yellow-600'
      }`}>
        {icon}
      </div>
      {isOpen && (
        <span className={`font-medium text-sm ${
          isActive ? 'text-yellow-700' : 'group-hover:text-yellow-600'
        }`}>
          {label}
        </span>
      )}
    </Link>
  );
}