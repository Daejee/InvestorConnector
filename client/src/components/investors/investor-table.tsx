import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Eye, Edit, Trash2, Calendar, Users, Mail, Phone, Building, Briefcase } from "lucide-react";
import InvestorFormSimplified from "@/components/investors/investor-form-simplified";
import type { Investor, Meeting } from "@shared/schema";

function InvestorDetailView({ investor }: { investor: Investor }) {
  const { data: meetings = [] } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
  });

  const investorMeetings = meetings.filter(meeting => 
    meeting.investorIds?.includes(investor.id.toString()) || false
  );

  return (
    <div className="space-y-6">
      {/* Basic Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-blue-800">
                {investor.avatarInitials || investor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold">{investor.name}</h3>
              <p className="text-gray-600">{investor.company}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="text-sm">{investor.email}</span>
            </div>
            {investor.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{investor.phone}</span>
              </div>
            )}
            {investor.fund && (
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{investor.fund}</span>
              </div>
            )}
            {investor.position && (
              <div className="flex items-center space-x-2">
                <Briefcase className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{investor.position}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {investor.positionType && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Position Type / R&R</h4>
              <p className="text-sm">{investor.positionType}</p>
            </div>
          )}
          
          {investor.specialty && investor.specialty.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Specialty / 담당분야</h4>
              <div className="flex flex-wrap gap-1">
                {investor.specialty.map((spec, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {spec}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Portfolio Management Experience */}
          {(investor.positionType === "PM" || investor.positionType === "Buyside Analyst") && (
            investor.totalExperience || investor.currentCompanyExperience || investor.managedFundAum || investor.numberOfManagedFunds
          ) && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Portfolio Management Experience / 포트폴리오 운용 경력</h4>
              <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                {investor.totalExperience && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">Total Experience / 총운용경력:</span>
                    <span className="text-xs font-medium">{investor.totalExperience} years</span>
                  </div>
                )}
                {investor.currentCompanyExperience && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">Current Company / 현회사운용경력:</span>
                    <span className="text-xs font-medium">{investor.currentCompanyExperience} years</span>
                  </div>
                )}
                {investor.managedFundAum && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">Managed Fund AUM / 운용펀드AUM:</span>
                    <span className="text-xs font-medium">${investor.managedFundAum}M</span>
                  </div>
                )}
                {investor.numberOfManagedFunds && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">Number of Funds / 운용펀드수:</span>
                    <span className="text-xs font-medium">{investor.numberOfManagedFunds}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Share Ownership / 지분 보유</h4>
            <div className="flex items-center space-x-2">
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
          </div>

          {investor.note && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Notes / 메모</h4>
              <p className="text-sm bg-gray-50 p-3 rounded-lg">{investor.note}</p>
            </div>
          )}
        </div>
      </div>

      {/* Meeting History Section */}
      <div className="border-t pt-6">
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Meeting History / 미팅 기록</h3>
          <Badge variant="outline">{investorMeetings.length}</Badge>
        </div>

        {investorMeetings.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No meetings recorded / 기록된 미팅이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {investorMeetings
              .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
              .map((meeting) => (
                <div key={meeting.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-sm">{meeting.title || 'Meeting'}</h4>
                      <p className="text-xs text-gray-500">
                        {new Date(meeting.scheduledDate).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <Badge 
                      variant={meeting.status === 'completed' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {meeting.status}
                    </Badge>
                  </div>
                  {meeting.description && (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{meeting.description}</p>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface InvestorTableProps {
  investors: Investor[];
  isLoading: boolean;
}

export default function InvestorTable({ investors, isLoading }: InvestorTableProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingInvestor, setEditingInvestor] = useState<Investor | null>(null);
  const [viewingInvestor, setViewingInvestor] = useState<Investor | null>(null);
  const [deletingInvestor, setDeletingInvestor] = useState<Investor | null>(null);

  const deleteInvestorMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/investors/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setDeletingInvestor(null);
      toast({
        title: "Success",
        description: "Investor deleted successfully",
      });
    },
    onError: (error: any) => {
      console.error('Delete investor error:', error);
      let errorMessage = "Failed to delete investor";
      
      try {
        // Try to extract detailed error message from server response
        if (error.message && error.message.includes(':')) {
          const serverResponse = error.message.split(': ')[1];
          const errorData = JSON.parse(serverResponse);
          if (errorData.details) {
            errorMessage = errorData.details;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        }
      } catch (parseError) {
        // Use the original error message if parsing fails
        errorMessage = error.message || "Failed to delete investor";
      }
      
      setDeletingInvestor(null);
      toast({
        title: "Delete Failed",
        description: errorMessage,
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
        <p className="text-gray-500">Loading PM...</p>
      </div>
    );
  }

  if (investors.length === 0) {
    return (
      <div className="p-6">
        <p className="text-gray-500">No PM found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px]">
        <thead className="bg-gray-50">
          <tr>
            <th className="pl-1 pr-1 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider w-[16%]">
              PM
            </th>
            <th className="px-1 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider w-[18%]">
              투신사
            </th>
            <th className="px-1 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider w-[14%]">
              설정원본(백만원)
            </th>
            <th className="px-1 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider w-[12%]">
              당사지분보유
            </th>
            <th className="px-1 pr-4 py-3 text-right text-sm font-medium text-gray-500 uppercase tracking-wider w-[40%]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {investors.map((investor) => (
            <tr key={investor.id} className="hover:bg-gray-50">
              <td className="pl-1 pr-1 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{investor.name}</div>
              </td>
              <td className="px-1 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{investor.company}</div>
              </td>
              <td className="px-1 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {investor.totalAssets ? `${Number(investor.totalAssets).toLocaleString()}` : '-'}
                </div>
              </td>
              <td className="px-1 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {investor.ownsOurShare === "Yes" ? (
                    <div>
                      <span className="text-sm bg-green-100 text-green-800 px-1 py-0 rounded">Yes</span>
                      {investor.shareAmount && (
                        <div className="text-sm text-gray-500 mt-1">{investor.shareAmount}</div>
                      )}
                    </div>
                  ) : investor.ownsOurShare === "No" ? (
                    <span className="text-sm bg-gray-100 text-gray-600 px-1 py-0 rounded">No</span>
                  ) : investor.ownsOurShare === "N/A" ? (
                    <span className="text-sm bg-yellow-100 text-yellow-800 px-1 py-0 rounded">N/A</span>
                  ) : (
                    <span className="text-gray-400 italic text-sm">N/A</span>
                  )}
                </div>
              </td>
              <td className="px-1 pr-4 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex space-x-1 justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setViewingInvestor(investor)}
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
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        disabled={deleteInvestorMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Investor / 투자자 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete <strong>{investor.name}</strong>? This action cannot be undone.
                          <br /><br />
                          <strong>Note:</strong> If this investor has meeting records, you must delete those meetings first before deleting the investor.
                          <br /><br />
                          <strong>참고:</strong> 이 투자자에게 미팅 기록이 있다면, 투자자를 삭제하기 전에 먼저 미팅을 삭제해야 합니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel / 취소</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            setDeletingInvestor(investor);
                            deleteInvestorMutation.mutate(investor.id);
                          }}
                          disabled={deleteInvestorMutation.isPending}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {deleteInvestorMutation.isPending ? "Deleting..." : "Delete / 삭제"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* View Investor Dialog */}
      <Dialog open={!!viewingInvestor} onOpenChange={() => setViewingInvestor(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Investor Details / 투자자 상세정보</DialogTitle>
            <DialogDescription>
              Complete investor information and meeting history / 투자자 상세 정보 및 미팅 기록
            </DialogDescription>
          </DialogHeader>
          {viewingInvestor && <InvestorDetailView investor={viewingInvestor} />}
        </DialogContent>
      </Dialog>

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
