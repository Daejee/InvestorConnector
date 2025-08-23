import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, Users, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FundManager } from "@shared/schema";

interface FundManagerTableProps {
  fundManagers: FundManager[];
  isLoading: boolean;
}

export default function FundManagerTable({ fundManagers, isLoading }: FundManagerTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (!fundManagers || fundManagers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Users className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">펀드매니저가 없습니다</h3>
        <p className="text-gray-500 mb-4">
          CSV 파일을 업로드하여 펀드매니저 데이터를 추가하세요.
        </p>
      </div>
    );
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return "N/A";
    return `${amount.toLocaleString()} 백만원`;
  };

  const formatExperience = (experience: string | null | undefined) => {
    if (!experience) return "N/A";
    return experience;
  };

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">운용사</TableHead>
            <TableHead className="w-24">성명</TableHead>
            <TableHead className="w-28">총 운용경력</TableHead>
            <TableHead className="w-28">현회사 경력</TableHead>
            <TableHead className="w-20 text-center">펀드수</TableHead>
            <TableHead className="w-40 text-right">설정원본</TableHead>
            <TableHead className="w-20 text-center">액션</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fundManagers.map((fm) => (
            <TableRow key={fm.id} className="hover:bg-gray-50">
              <TableCell className="font-medium">
                <div className="max-w-32 truncate" title={fm.company}>
                  {fm.company}
                </div>
              </TableCell>
              <TableCell className="font-medium">
                <div className="max-w-24 truncate" title={fm.name}>
                  {fm.name}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {formatExperience(fm.totalExperience)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {formatExperience(fm.currentCompanyExperience)}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center">
                  <TrendingUp className="h-3 w-3 mr-1 text-blue-500" />
                  <span className="text-sm font-medium">{fm.numberOfFunds || 0}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="font-medium text-green-600">
                  {formatCurrency(Number(fm.totalAssets))}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="수정"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                    title="삭제"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}