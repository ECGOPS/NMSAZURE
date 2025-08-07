import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import AzureADLoginForm from "@/components/auth/AzureADLoginForm";
import { useAzureADAuth } from "@/contexts/AzureADAuthContext";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const { isAuthenticated, user, loading } = useAzureADAuth();
  const navigate = useNavigate();
  
  console.log('LoginPage - isAuthenticated:', isAuthenticated, 'user:', user, 'loading:', loading);
  
  useEffect(() => {
    if (isAuthenticated) {
      console.log('User is authenticated, redirecting to dashboard');
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);
  
  return (
    <div className="relative min-h-screen">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: "url('/images/ops.png')",
          zIndex: -1
        }}
      />
      <Layout>
        <div className="container mx-auto py-4 sm:py-10 px-4">
          <div className="max-w-[90%] sm:max-w-md mx-auto">
            <AzureADLoginForm />
          </div>
        </div>
      </Layout>
    </div>
  );
}
