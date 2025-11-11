import { useState, useEffect } from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaTimes, FaExclamationTriangle } from 'react-icons/fa';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedRole = localStorage.getItem('userRole');
    if (!storedRole) {
      toast.error('Session expired. Please log in again.');
      navigate('/');
    } else {
      setRole(storedRole);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    toast.success('Logout successful!');
    setTimeout(() => navigate('/'), 1500);
  };

  const marginLeft = sidebarOpen ? 'ml-64' : 'ml-16';

  return (
    <div className="min-h-screen bg-gray-50 font-garamond">
      <TopBar setShowConfirm={setShowConfirm} />
      {role && (
        <Sidebar
          isOpen={sidebarOpen}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
      )}

      <main className={`p-6 pt-20 transition-all duration-300 ${marginLeft}`}>
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md z-50 relative">
            <button
              onClick={() => setShowConfirm(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl transition-colors duration-150"
              aria-label="Close"
            >
              <FaTimes />
            </button>

            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <FaExclamationTriangle className="h-6 w-6 text-red-600" />
              </div>
              
              <h2 className="text-lg font-semibold mb-2 text-red-600">
                Confirm Logout
              </h2>

              <p className="text-gray-700 mb-6">
                Are you sure you want to log out? You'll need to sign in again to access the system.
              </p>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-150 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    handleLogout();
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-150 font-medium flex items-center gap-2"
                >
                  <FaSignOutAlt /> Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}