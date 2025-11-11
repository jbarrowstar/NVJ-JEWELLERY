import logo from '../assets/logo.png';
import profile from '../assets/profile.jpg';
import { FaSignOutAlt } from 'react-icons/fa';

export default function TopBar({
  setShowConfirm,
}: {
  setShowConfirm: (value: boolean) => void;
}) {
  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between z-50">
      {/* Left Section - Logo & Brand */}
      <div className="flex items-center space-x-3">
        <img src={logo} alt="Nirvaha Jewels Logo" className="h-10 w-auto" />
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-yellow-700">NIRVAHA JEWELLERS</h1>
        </div>
      </div>

      {/* Right Section - User Profile & Logout */}
      <div className="flex items-center gap-4">
        {/* User Profile */}
        <div className="flex items-center gap-3">
          <div className="relative group">
            <img 
              src={profile} 
              alt="User Profile" 
              className="h-8 w-8 rounded-full border-2 border-gray-200 group-hover:border-yellow-500 transition-colors duration-150"
            />
            <div className="absolute inset-0 bg-yellow-500 opacity-0 group-hover:opacity-20 rounded-full transition-opacity duration-150"></div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => setShowConfirm(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-150 flex items-center gap-2 font-medium"
        >
          <FaSignOutAlt className="h-3 w-3" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}