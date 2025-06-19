import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Eye, Edit, Trash2 } from "lucide-react";
import InvestorFormSimplified from "@/components/investors/investor-form-simplified";
import type { Investor } from "@shared/schema";

interface InvestorTableProps {
  investors: Investor[];
  isLoading: boolean;
}

export default function InvestorTable({ investors, isLoading }: InvestorTableProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingInvestor, setEditingInvestor] = useState<Investor | null>(null);

  const deleteInvestorMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/investors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Investor deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete investor",
        variant: "destructive",
      });
    },
  });



  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading investors...</p>
      </div>
    );
  }

  if (investors.length === 0) {
    return (
      <div className="p-6">
        <p className="text-gray-500">No investors found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px]">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[22%]">
              Investor
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[25%]">
              Company & Fund
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">
              Ownership
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[23%]">
              Note
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {investors.map((investor) => (
            <tr key={investor.id} className="hover:bg-gray-50">
              <td className="px-3 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-medium text-sm">
                      {investor.avatarInitials || getInitials(investor.name)}
                    </span>
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{investor.name}</div>
                    <div className="text-sm text-gray-500">{investor.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{investor.company}</div>
                {investor.fund && (
                  <div className="text-xs text-purple-600 font-medium">{investor.fund}</div>
                )}
                <div className="text-sm text-gray-500">
                  {investor.position}
                  {investor.positionType && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {investor.positionType}
                    </span>
                  )}
                </div>
                {investor.positionType === "Buyside Analyst" && investor.specialtyType && (
                  <div className="text-xs text-gray-400 mt-1">
                    {investor.specialtyType === "industry" && investor.industryArea && (
                      <span>Industry: {investor.industryArea}</span>
                    )}
                    {investor.specialtyType === "regional" && investor.region && (
                      <span>Region: {investor.region}</span>
                    )}
                  </div>
                )}
              </td>
              <td className="px-3 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {investor.ownsOurShare === "Yes" ? (
                    <div>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Yes</span>
                      {investor.shareAmount && (
                        <div className="text-xs text-gray-500 mt-1">{investor.shareAmount}</div>
                      )}
                    </div>
                  ) : investor.ownsOurShare === "No" ? (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">No</span>
                  ) : investor.ownsOurShare === "N/A" ? (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">N/A</span>
                  ) : (
                    <span className="text-gray-400 italic text-xs">Not specified</span>
                  )}
                </div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 max-w-xs truncate">
                  {investor.note || <span className="text-gray-400 italic">No notes</span>}
                </div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex space-x-1 justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      toast({
                        title: "View Investor",
                        description: `Viewing details for ${investor.name}`,
                      });
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setEditingInvestor(investor)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => deleteInvestorMutation.mutate(investor.id)}
                    disabled={deleteInvestorMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Edit Dialog */}
      <Dialog open={!!editingInvestor} onOpenChange={() => setEditingInvestor(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Investor</DialogTitle>
          </DialogHeader>
          {editingInvestor && (
            <InvestorFormSimplified 
              investor={editingInvestor}
              onSuccess={() => setEditingInvestor(null)}
              onCancel={() => setEditingInvestor(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
