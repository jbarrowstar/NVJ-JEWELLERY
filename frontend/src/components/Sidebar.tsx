import type { JSX } from 'react';
import {
  FaHome,
  FaFileInvoice,
  FaHistory,
  FaUndo,
  FaUsers,
  FaTimes,
  FaBars,
} from 'react-icons/fa';

export default function Sidebar({
  isOpen,
  toggleSidebar,
}: {
  isOpen: boolean;
  toggleSidebar: () => void;
}) {
  return (
    <div
      className={`bg-white shadow-md h-screen flex flex-col transition-all duration-300 z-50 ${
        isOpen ? 'w-64' : 'w-16'
      }`}
    >
      {/* Toggle Button Always Visible */}
      <div className="flex justify-end p-4">
        <button
          onClick={toggleSidebar}
          className="text-gray-600 hover:text-yellow-600 text-xl"
        >
          {isOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {/* Navigation Items Only When Open */}
      {isOpen && (
        <nav className="flex flex-col gap-4 px-4 text-gray-700">
          <NavItem icon={<FaHome />} label="Home" />
          <NavItem icon={<FaFileInvoice />} label="Billing POS" />
          <NavItem icon={<FaHistory />} label="Order History" />
          <NavItem icon={<FaUndo />} label="Return Refunds" />
          <NavItem icon={<FaUsers />} label="Customers" />
        </nav>
      )}
    </div>
  );
}

function NavItem({
  icon,
  label,
}: {
  icon: JSX.Element;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 cursor-pointer hover:text-yellow-600">
      <div className="text-lg">{icon}</div>
      <span>{label}</span>
    </div>
  );
}
