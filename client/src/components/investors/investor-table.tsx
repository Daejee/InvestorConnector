import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Eye, Edit, Trash2 } from "lucide-react";
import type { Investor } from "@shared/schema";

interface InvestorTableProps {
  investors: Investor[];
  isLoading: boolean;
}

export default function InvestorTable({ investors, isLoading }: InvestorTableProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "in-review":
        return "bg-yellow-100 text-yellow-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Investor
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Company
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {investors.map((investor) => (
            <tr key={investor.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-medium text-sm">
                      {investor.avatarInitials || getInitials(investor.name)}
                    </span>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{investor.name}</div>
                    <div className="text-sm text-gray-500">{investor.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{investor.company}</div>
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
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge className={getStatusColor(investor.status)}>
                  {investor.status}
                </Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
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
    </div>
  );
}
