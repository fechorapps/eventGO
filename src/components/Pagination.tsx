'use client';
import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { PagingData } from '@/types/pagination';

export interface PaginationProps {
  paging?: PagingData<unknown>;
  // Fallbacks if passed individually
  pageIndex?: number;
  pageSize?: number;
  totalRowsCount?: number;
  totalPages?: number;
  currentPage?: number;
  totalItems?: number;

  onPageChange: (pageIndex: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
}

export default function Pagination({
  paging,
  pageIndex: propPageIndex,
  pageSize: propPageSize,
  totalRowsCount: propTotalRowsCount,
  totalPages: propTotalPages,
  currentPage: propCurrentPage,
  totalItems: propTotalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemLabel = 'registros',
  className = '',
}: PaginationProps) {
  // Resolve values prioritizing PagingData
  const activePageIndex = paging?.pageIndex ?? propPageIndex ?? propCurrentPage ?? 1;
  const activePageSize = paging?.pageSize ?? propPageSize ?? 10;
  const activeTotalRows = paging?.totalRowsCount ?? propTotalRowsCount ?? propTotalItems ?? 0;
  const calculatedTotalPages =
    paging?.totalPages ??
    propTotalPages ??
    Math.max(1, Math.ceil(activeTotalRows / Math.max(1, activePageSize)));

  const safePageIndex = Math.min(Math.max(1, activePageIndex), calculatedTotalPages);

  const startItem = activeTotalRows === 0 ? 0 : (safePageIndex - 1) * activePageSize + 1;
  const endItem = Math.min(activeTotalRows, safePageIndex * activePageSize);

  // Generate page numbers with smart ellipsis
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];

    if (calculatedTotalPages <= 7) {
      for (let i = 1; i <= calculatedTotalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      const leftThreshold = Math.max(2, safePageIndex - 1);
      const rightThreshold = Math.min(calculatedTotalPages - 1, safePageIndex + 1);

      if (leftThreshold > 2) {
        pages.push('ellipsis-start');
      }

      for (let i = leftThreshold; i <= rightThreshold; i++) {
        if (i > 1 && i < calculatedTotalPages) {
          pages.push(i);
        }
      }

      if (rightThreshold < calculatedTotalPages - 1) {
        pages.push('ellipsis-end');
      }

      pages.push(calculatedTotalPages);
    }

    return pages;
  };

  if (activeTotalRows <= 0) return null;

  return (
    <div className={`pagination-container ${className}`}>
      <div className="pagination-info">
        Mostrando <strong className="pagination-highlight">{startItem}–{endItem}</strong> de{' '}
        <strong className="pagination-highlight">{activeTotalRows}</strong> {itemLabel}
      </div>

      <div className="pagination-controls-wrapper">
        {onPageSizeChange && (
          <div className="pagination-page-size-selector">
            <span className="pagination-size-label">Mostrar:</span>
            <select
              value={activePageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onPageSizeChange(newSize);
                onPageChange(1);
              }}
              className="pagination-select"
              aria-label="Cantidad de elementos por página"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} por pág.
                </option>
              ))}
            </select>
          </div>
        )}

        {calculatedTotalPages > 1 && (
          <nav className="pagination-nav" aria-label="Navegación de páginas">
            {/* First page button */}
            <button
              type="button"
              onClick={() => onPageChange(1)}
              disabled={safePageIndex <= 1}
              className="pagination-btn pagination-btn-nav"
              title="Primera página"
              aria-label="Primera página"
            >
              <ChevronsLeft size={16} />
            </button>

            {/* Previous button */}
            <button
              type="button"
              onClick={() => onPageChange(safePageIndex - 1)}
              disabled={safePageIndex <= 1}
              className="pagination-btn pagination-btn-nav"
              title="Página anterior"
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Desktop page pills */}
            <div className="pagination-pages-desktop">
              {getPageNumbers().map((pageItem, idx) => {
                if (typeof pageItem === 'string') {
                  return (
                    <span key={`${pageItem}-${idx}`} className="pagination-ellipsis">
                      …
                    </span>
                  );
                }

                const isActive = pageItem === safePageIndex;
                return (
                  <button
                    key={pageItem}
                    type="button"
                    onClick={() => onPageChange(pageItem)}
                    className={`pagination-btn pagination-page-pill ${isActive ? 'active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {pageItem}
                  </button>
                );
              })}
            </div>

            {/* Mobile page info */}
            <div className="pagination-pages-mobile">
              <span>
                Pág. <strong>{safePageIndex}</strong> de <strong>{calculatedTotalPages}</strong>
              </span>
            </div>

            {/* Next button */}
            <button
              type="button"
              onClick={() => onPageChange(safePageIndex + 1)}
              disabled={safePageIndex >= calculatedTotalPages}
              className="pagination-btn pagination-btn-nav"
              title="Página siguiente"
              aria-label="Página siguiente"
            >
              <ChevronRight size={16} />
            </button>

            {/* Last page button */}
            <button
              type="button"
              onClick={() => onPageChange(calculatedTotalPages)}
              disabled={safePageIndex >= calculatedTotalPages}
              className="pagination-btn pagination-btn-nav"
              title="Última página"
              aria-label="Última página"
            >
              <ChevronsRight size={16} />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
