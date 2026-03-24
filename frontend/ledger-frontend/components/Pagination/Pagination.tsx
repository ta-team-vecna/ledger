import MuiPagination from '@mui/material/Pagination';
import styles from './Pagination.module.css';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const Pagination = ({ page, totalPages, totalCount, pageSize, onPageChange }: PaginationProps) => {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <div className={styles.container}>
      <span className={styles.info}>
        Showing {from}–{to} of {totalCount}
      </span>
      <MuiPagination
        count={totalPages}
        page={page}
        onChange={(_, value) => onPageChange(value)}
        shape="rounded"
        size="small"
        color="primary"
      />
    </div>
  );
};

export default Pagination;
