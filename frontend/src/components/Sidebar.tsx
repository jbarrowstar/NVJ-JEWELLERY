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
      className={`fixed top-16 left-0 h-[calc(100vh-4rem)] bg-white shadow-md flex flex-col transition-all duration-300 z-40 ${
        isOpen ? 'w-64' : 'w-16'
      }`}
    >
      <div className="flex justify-end p-4">
        <button
          onClick={toggleSidebar}
          className="text-gray-600 hover:text-yellow-600 text-xl"
        >
          {isOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      <nav className="flex flex-col gap-4 px-4 text-gray-700">
        <NavItem icon={<FaHome />} label="Home" to="/dashboard" isOpen={isOpen} />
        <NavItem icon={<FaFileInvoice />} label="Billing POS" to="/billing" isOpen={isOpen} />
        <NavItem icon={<FaHistory />} label="Order History" to="/orders" isOpen={isOpen} />
        <NavItem icon={<FaUndo />} label="Return Refunds" to="/returns" isOpen={isOpen} />
        <NavItem icon={<FaUsers />} label="Customers" to="/customers" isOpen={isOpen} />
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
