import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import InvestorTable from "@/components/investors/investor-table";
import InvestorFormSimplified from "@/components/investors/investor-form-simplified";
import { Plus, Search } from "lucide-react";
import type { OverseasInvestor } from "@shared/schema";

export default function OverseasInvestors() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: investors, isLoading } = useQuery<OverseasInvestor[]>({
    queryKey: ["/api/overseas-investors"],
  });

  const filteredInvestors = investors?.filter(investor =>
    investor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    investor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    investor.company.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">해외투자가</h2>
            <p className="text-gray-600 mt-1">해외투자가 Profile 관리</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  해외투자가 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>새 해외투자가 추가</DialogTitle>
                </DialogHeader>
                <InvestorFormSimplified 
                  onSuccess={() => setIsDialogOpen(false)}
                  onCancel={() => setIsDialogOpen(false)}
                  apiBasePath="/api/overseas-investors"
                  companiesApiPath="/api/overseas-companies"
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>전체 해외투자가</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="해외투자가 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <InvestorTable 
            investors={filteredInvestors} 
            isLoading={isLoading}
            apiBasePath="/api/overseas-investors"
            companiesApiPath="/api/overseas-companies"
          />
        </CardContent>
      </Card>
    </div>
  );
}