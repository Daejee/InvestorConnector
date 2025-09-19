import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function BestirHome() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* BESTIR Logo */}
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Best <span className="text-blue-600 dark:text-blue-400">i</span>R
          </h1>
        </div>
        
        {/* Navigation Links */}
        <div className="space-y-6 pt-8">
          {/* CRM Link */}
          <Link href="/org/default" data-testid="link-crm">
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full text-lg py-6 border-2 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
            >
              IRCRM
            </Button>
          </Link>
          
          {/* BESTIR Academy Link */}
          <Link href="/academy" data-testid="link-academy">
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full text-lg py-6 border-2 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
            >
              IR ACADEMY
            </Button>
          </Link>
        </div>
        
        {/* Footer */}
        <div className="pt-12 text-sm text-gray-500 dark:text-gray-400">
          <p>Best in class Investor Relations platform</p>
        </div>
      </div>
    </div>
  );
}