import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Building2, DollarSign, TrendingUp } from "lucide-react";
import FundForm from "@/components/funds/fund-form";
import { type Fund, type Company } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Funds() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: funds = [], isLoading } = useQuery<Fund[]>({
    queryKey: ["/api/funds"],
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const deleteFundMutation = useMutation({
    mutationFn: async (fundId: number) => {
      const response = await apiRequest("DELETE", `/api/funds/${fundId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funds"] });
      toast({
        title: "Success",
        description: "Fund deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete fund",
        variant: "destructive",
      });
    },
  });

  const getCompanyName = (companyId: number) => {
    const company = companies.find(c => c.id === companyId);
    return company?.name || "Unknown Company";
  };

  const formatAum = (aum: string) => {
    const aumValue = parseFloat(aum);
    if (isNaN(aumValue)) return "N/A";
    return `$${aumValue.toFixed(1)}B`;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Value": return "bg-blue-100 text-blue-800";
      case "Growth": return "bg-green-100 text-green-800";
      case "GARP": return "bg-purple-100 text-purple-800";
      case "Other": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading funds...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Funds</h2>
            <p className="text-gray-600 mt-1">Manage fund portfolios and investment strategies</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Fund
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Fund</DialogTitle>
                </DialogHeader>
                <FundForm 
                  onSuccess={handleFormSuccess}
                  onCancel={() => setIsDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Funds</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{funds.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total AUM</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${funds.reduce((sum, fund) => sum + (parseFloat(fund.aum) || 0), 0).toFixed(1)}B
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Own Our Shares</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {funds.filter(fund => fund.ownOurShares).length}
            </div>
            <p className="text-xs text-muted-foreground">
              funds hold our shares
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Funds Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fund Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          {funds.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No funds found</h3>
              <p className="text-gray-500 mb-4">Get started by adding your first fund.</p>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Fund
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Fund</DialogTitle>
                  </DialogHeader>
                  <FundForm 
                    onSuccess={handleFormSuccess}
                    onCancel={() => setIsDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fund Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>AUM</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Own Our Shares</TableHead>
                  <TableHead>Share Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funds.map((fund) => (
                  <TableRow key={fund.id}>
                    <TableCell className="font-medium">{fund.name}</TableCell>
                    <TableCell>{getCompanyName(fund.companyId)}</TableCell>
                    <TableCell>{formatAum(fund.aum)}</TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(fund.type)}>
                        {fund.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={fund.ownOurShares ? "default" : "secondary"}>
                        {fund.ownOurShares ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {fund.ownOurShares && fund.shareAmount ? fund.shareAmount : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => deleteFundMutation.mutate(fund.id)}
                          disabled={deleteFundMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}