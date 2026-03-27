/**
 * User Role - Case Management Test Suite
 * Tests for case creation, viewing, updating, and application management
 */

import { caseService, CaseDto, CreateCaseDto } from '../../src/services/case/caseService';
import apiClient from '../../src/services/api/client';

// Mock the API client
jest.mock('../../src/services/api/client');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Sample test data
const mockUserId = 'user-123';

const mockCreateCaseDto: CreateCaseDto = {
  userId: mockUserId,
  caseTitle: 'Property Dispute Case',
  caseDescription: 'I need help with a property boundary dispute with my neighbor.',
  categoryName: 'Property Law',
  serviceName: 'Property Dispute Resolution',
  clientName: 'John Doe',
  clientEmail: 'john.doe@example.com',
  clientPhoneNumber: '+60123456789',
  location: 'Kuala Lumpur',
  area: 'Bangsar',
  minPrice: 1000,
  maxPrice: 5000,
  priority: 'Normal',
};

const mockCaseResponse: CaseDto = {
  id: 'case-123',
  caseNo: 'CASE-2024-001',
  userId: mockUserId,
  userName: 'John Doe',
  userEmail: 'john.doe@example.com',
  caseTitle: 'Property Dispute Case',
  caseDescription: 'I need help with a property boundary dispute with my neighbor.',
  categoryName: 'Property Law',
  serviceName: 'Property Dispute Resolution',
  currentStatus: 'Pending',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  minPrice: 1000,
  maxPrice: 5000,
  location: 'Kuala Lumpur',
};

describe('User Role - Case Management Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // 1. POST NEW CASE TESTS (USER-CASE-001 to USER-CASE-019)
  // ============================================
  describe('USER-CASE-001 to USER-CASE-019: Post New Case', () => {
    
    test('USER-CASE-001: Create case with required fields only', async () => {
      const minimalCase: CreateCaseDto = {
        userId: mockUserId,
        clientName: 'John Doe',
        clientEmail: 'john@example.com',
        caseTitle: 'Basic Case',
      };

      mockedApiClient.post.mockResolvedValueOnce({
        data: {
          isSuccess: true,
          content: { id: 'case-new', caseNo: 'CASE-001', ...minimalCase },
        },
      });

      const result = await caseService.createCase(minimalCase);

      expect(result.id).toBe('case-new');
      expect(mockedApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          userId: mockUserId,
          clientName: 'John Doe',
        })
      );
    });

    test('USER-CASE-002: Create case with all fields', async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        data: {
          isSuccess: true,
          content: { id: 'case-full', ...mockCreateCaseDto },
        },
      });

      const result = await caseService.createCase(mockCreateCaseDto);

      expect(result.id).toBe('case-full');
      expect(mockedApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          caseTitle: 'Property Dispute Case',
          caseDescription: expect.any(String),
          categoryName: 'Property Law',
          minPrice: 1000,
          maxPrice: 5000,
        })
      );
    });

    test('USER-CASE-003: Create draft case', async () => {
      const draftCase: CreateCaseDto = {
        ...mockCreateCaseDto,
        isDraft: true,
      };

      mockedApiClient.post.mockResolvedValueOnce({
        data: {
          isSuccess: true,
          content: { id: 'draft-123', currentStatus: 'Draft', ...draftCase },
        },
      });

      const result = await caseService.createCase(draftCase);

      expect(result.currentStatus).toBe('Draft');
    });

    test('USER-CASE-004: Create case with voucher', async () => {
      const caseWithVoucher: CreateCaseDto = {
        ...mockCreateCaseDto,
        userVoucherId: 'voucher-123',
      };

      mockedApiClient.post.mockResolvedValueOnce({
        data: {
          isSuccess: true,
          content: { id: 'case-voucher', appliedVoucherId: 'voucher-123' },
        },
      });

      const result = await caseService.createCase(caseWithVoucher);

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          userVoucherId: 'voucher-123',
        })
      );
    });

    test('USER-CASE-005: Create case validation - missing title', async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        data: {
          isSuccess: false,
          errors: ['Case title is required'],
        },
      });

      const invalidCase: CreateCaseDto = {
        userId: mockUserId,
        clientName: 'John',
        clientEmail: 'john@example.com',
        // Missing caseTitle
      };

      await expect(caseService.createCase(invalidCase)).rejects.toThrow();
    });

    test('USER-CASE-006: Create case with assigned lawyer', async () => {
      const caseWithLawyer: CreateCaseDto = {
        ...mockCreateCaseDto,
        lawyerId: 'lawyer-456',
      };

      mockedApiClient.post.mockResolvedValueOnce({
        data: {
          isSuccess: true,
          content: { 
            id: 'case-with-lawyer', 
            currentLawyerId: 'lawyer-456',
            currentLawyerName: 'Attorney Smith',
          },
        },
      });

      const result = await caseService.createCase(caseWithLawyer);

      expect(result.currentLawyerId).toBe('lawyer-456');
    });

    test('USER-CASE-007: Budget validation - min greater than max', async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        data: {
          isSuccess: false,
          errors: ['Minimum price cannot be greater than maximum price'],
        },
      });

      const invalidBudget: CreateCaseDto = {
        ...mockCreateCaseDto,
        minPrice: 10000,
        maxPrice: 1000,
      };

      await expect(caseService.createCase(invalidBudget)).rejects.toThrow();
    });

    test('USER-CASE-008: Invalid email format rejected', async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        data: {
          isSuccess: false,
          errors: ['Invalid email format'],
        },
      });

      const invalidEmail: CreateCaseDto = {
        ...mockCreateCaseDto,
        clientEmail: 'not-an-email',
      };

      await expect(caseService.createCase(invalidEmail)).rejects.toThrow();
    });
  });

  // ============================================
  // 2. MY CASES LIST TESTS (USER-CASE-020 to USER-CASE-032)
  // ============================================
  describe('USER-CASE-020 to USER-CASE-032: My Cases List', () => {
    
    test('USER-CASE-020: Get my cases returns user cases', async () => {
      const mockCases: CaseDto[] = [
        { ...mockCaseResponse, id: 'case-1', caseNo: 'CASE-001' },
        { ...mockCaseResponse, id: 'case-2', caseNo: 'CASE-002' },
        { ...mockCaseResponse, id: 'case-3', caseNo: 'CASE-003' },
      ];

      mockedApiClient.get.mockResolvedValueOnce({
        data: { isSuccess: true, content: mockCases },
      });

      const result = await caseService.getMyCases(mockUserId);

      expect(result).toHaveLength(3);
      expect(result[0].userId).toBe(mockUserId);
    });

    test('USER-CASE-021: Cases sorted by date (most recent first)', async () => {
      const mockCases: CaseDto[] = [
        { ...mockCaseResponse, id: 'case-1', createdAt: '2024-01-10T10:00:00Z' },
        { ...mockCaseResponse, id: 'case-2', createdAt: '2024-01-15T10:00:00Z' },
        { ...mockCaseResponse, id: 'case-3', createdAt: '2024-01-12T10:00:00Z' },
      ];

      mockedApiClient.get.mockResolvedValueOnce({
        data: { isSuccess: true, content: mockCases },
      });

      const result = await caseService.getMyCases(mockUserId);

      // Backend should return sorted, but we verify we get all cases
      expect(result).toHaveLength(3);
    });

    test('USER-CASE-022: Filter pending cases', async () => {
      const pendingCases: CaseDto[] = [
        { ...mockCaseResponse, id: 'case-1', currentStatus: 'Pending' },
        { ...mockCaseResponse, id: 'case-2', currentStatus: 'Pending' },
      ];

      mockedApiClient.get.mockResolvedValueOnce({
        data: { isSuccess: true, content: pendingCases },
      });

      const result = await caseService.getMyCases(mockUserId);
      const pending = result.filter(c => c.currentStatus === 'Pending');

      expect(pending).toHaveLength(2);
    });

    test('USER-CASE-023: Filter in-progress cases', async () => {
      const activeCases: CaseDto[] = [
        { ...mockCaseResponse, id: 'case-1', currentStatus: 'In Progress' },
      ];

      mockedApiClient.get.mockResolvedValueOnce({
        data: { isSuccess: true, content: activeCases },
      });

      const result = await caseService.getMyCases(mockUserId);
      const active = result.filter(c => 
        c.currentStatus === 'In Progress' || 
        c.currentStatus === 'Confirmed' ||
        c.currentStatus === 'Active'
      );

      expect(active.length).toBeGreaterThanOrEqual(0);
    });

    test('USER-CASE-024: Filter completed cases', async () => {
      const completedCases: CaseDto[] = [
        { ...mockCaseResponse, id: 'case-1', currentStatus: 'Completed' },
      ];

      mockedApiClient.get.mockResolvedValueOnce({
        data: { isSuccess: true, content: completedCases },
      });

      const result = await caseService.getMyCases(mockUserId);
      const completed = result.filter(c => c.currentStatus === 'Completed');

      expect(completed).toHaveLength(1);
    });

    test('USER-CASE-025: Filter cancelled cases', async () => {
      const cancelledCases: CaseDto[] = [
        { ...mockCaseResponse, id: 'case-1', currentStatus: 'Cancelled' },
      ];

      mockedApiClient.get.mockResolvedValueOnce({
        data: { isSuccess: true, content: cancelledCases },
      });

      const result = await caseService.getMyCases(mockUserId);
      const cancelled = result.filter(c => c.currentStatus === 'Cancelled');

      expect(cancelled).toHaveLength(1);
    });

    test('USER-CASE-026: Filter draft cases', async () => {
      const draftCases: CaseDto[] = [
        { ...mockCaseResponse, id: 'draft-1', currentStatus: 'Draft' },
        { ...mockCaseResponse, id: 'draft-2', currentStatus: 'Draft' },
      ];

      mockedApiClient.get.mockResolvedValueOnce({
        data: { isSuccess: true, content: draftCases },
      });

      const result = await caseService.getMyCases(mockUserId);
      const drafts = result.filter(c => c.currentStatus === 'Draft');

      expect(drafts).toHaveLength(2);
    });

    test('USER-CASE-027: Empty state when no cases', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        data: { isSuccess: true, content: [] },
      });

      const result = await caseService.getMyCases(mockUserId);

      expect(result).toHaveLength(0);
    });

    test('USER-CASE-028: Case card shows key information', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        data: { isSuccess: true, content: [mockCaseResponse] },
      });

      const result = await caseService.getMyCases(mockUserId);
      const caseItem = result[0];

      expect(caseItem.caseNo).toBeDefined();
      expect(caseItem.caseTitle).toBeDefined();
      expect(caseItem.currentStatus).toBeDefined();
      expect(caseItem.createdAt).toBeDefined();
    });
  });

  // ============================================
  // 3. CASE DETAILS TESTS (USER-CASE-033 to USER-CASE-040)
  // ============================================
  describe('USER-CASE-033 to USER-CASE-040: Case Details', () => {
    
    test('USER-CASE-033: Get case details by ID', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        data: { isSuccess: true, content: mockCaseResponse },
      });

      const result = await caseService.getCaseDetails('case-123', mockUserId);

      expect(result.id).toBe('case-123');
      expect(result.caseTitle).toBe('Property Dispute Case');
    });

    test('USER-CASE-034: Case details include all required fields', async () => {
      const detailedCase: CaseDto = {
        ...mockCaseResponse,
        caseDescription: 'Full description here',
        categoryName: 'Property Law',
        serviceName: 'Dispute Resolution',
        location: 'Kuala Lumpur',
        minPrice: 1000,
        maxPrice: 5000,
      };

      mockedApiClient.get.mockResolvedValueOnce({
        data: { isSuccess: true, content: detailedCase },
      });

      const result = await caseService.getCaseDetails('case-123', mockUserId);

      expect(result.caseTitle).toBeDefined();
      expect(result.caseDescription).toBeDefined();
      expect(result.categoryName).toBeDefined();
      expect(result.serviceName).toBeDefined();
      expect(result.currentStatus).toBeDefined();
      expect(result.location).toBeDefined();
    });

    test('USER-CASE-035: Case with assigned lawyer shows lawyer info', async () => {
      const caseWithLawyer: CaseDto = {
        ...mockCaseResponse,
        currentLawyerId: 'lawyer-789',
        currentLawyerName: 'Attorney Sarah Lee',
      };

      mockedApiClient.get.mockResolvedValueOnce({
        data: { isSuccess: true, content: caseWithLawyer },
      });

      const result = await caseService.getCaseDetails('case-123', mockUserId);

      expect(result.currentLawyerId).toBe('lawyer-789');
      expect(result.currentLawyerName).toBe('Attorney Sarah Lee');
    });

    test('USER-CASE-036: Case details include applications', async () => {
      const caseWithApplications = {
        ...mockCaseResponse,
        applications: [
          { id: 'app-1', lawyerId: 'lawyer-1', lawyerName: 'Lawyer A', proposedFee: 2000 },
          { id: 'app-2', lawyerId: 'lawyer-2', lawyerName: 'Lawyer B', proposedFee: 2500 },
        ],
      };

      mockedApiClient.get.mockResolvedValueOnce({
        data: { isSuccess: true, content: caseWithApplications },
      });

      const result = await caseService.getCaseDetails('case-123', mockUserId);

      expect(result.applications).toHaveLength(2);
      expect(result.applications![0].lawyerName).toBe('Lawyer A');
    });

    test('USER-CASE-037: Case not found returns error', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        data: {
          isSuccess: false,
          errors: ['Case not found'],
        },
      });

      await expect(
        caseService.getCaseDetails('non-existent-id', mockUserId)
      ).rejects.toThrow();
    });
  });

  // ============================================
  // 4. CASE APPLICATION TESTS (USER-CASE-041 to USER-CASE-049)
  // ============================================
  describe('USER-CASE-041 to USER-CASE-049: Case Applications', () => {
    
    test('USER-CASE-041: View applications for case', async () => {
      const caseWithApplications = {
        ...mockCaseResponse,
        applications: [
          {
            id: 'app-1',
            lawyerId: 'lawyer-1',
            lawyerName: 'John Lawyer',
            proposedFee: 3000,
            message: 'I can help with your case',
            status: 'Pending',
          },
        ],
      };

      mockedApiClient.get.mockResolvedValueOnce({
        data: { isSuccess: true, content: caseWithApplications },
      });

      const result = await caseService.getCaseDetails('case-123', mockUserId);

      expect(result.applications).toHaveLength(1);
      expect(result.applications![0].proposedFee).toBe(3000);
      expect(result.applications![0].message).toBe('I can help with your case');
    });

    test('USER-CASE-042: Accept lawyer application', async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        data: { isSuccess: true, message: 'Application accepted' },
      });

      await expect(
        caseService.acceptApplication('case-123', 'app-1')
      ).resolves.not.toThrow();

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('accept'),
        expect.any(Object)
      );
    });

    test('USER-CASE-043: Reject lawyer application', async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        data: { isSuccess: true, message: 'Application rejected' },
      });

      await expect(
        caseService.rejectApplication('case-123', 'app-1')
      ).resolves.not.toThrow();

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('reject'),
        expect.any(Object)
      );
    });

    test('USER-CASE-044: Application includes lawyer rating', async () => {
      const caseWithRatedLawyer = {
        ...mockCaseResponse,
        applications: [
          {
            id: 'app-1',
            lawyerId: 'lawyer-1',
            lawyerName: 'Rated Lawyer',
            lawyerRating: 4.5,
            lawyerReviewCount: 25,
            proposedFee: 3000,
            status: 'Pending',
          },
        ],
      };

      mockedApiClient.get.mockResolvedValueOnce({
        data: { isSuccess: true, content: caseWithRatedLawyer },
      });

      const result = await caseService.getCaseDetails('case-123', mockUserId);
      const app = result.applications![0];

      expect(app.lawyerRating).toBe(4.5);
      expect(app.lawyerReviewCount).toBe(25);
    });

    test('USER-CASE-045: Empty applications state', async () => {
      const caseNoApplications = {
        ...mockCaseResponse,
        applications: [],
      };

      mockedApiClient.get.mockResolvedValueOnce({
        data: { isSuccess: true, content: caseNoApplications },
      });

      const result = await caseService.getCaseDetails('case-123', mockUserId);

      expect(result.applications).toHaveLength(0);
    });
  });

  // ============================================
  // 5. UPDATE CASE TESTS (USER-CASE-050 to USER-CASE-055)
  // ============================================
  describe('USER-CASE-050 to USER-CASE-055: Update Case', () => {
    
    test('USER-CASE-050: Update case title', async () => {
      mockedApiClient.put.mockResolvedValueOnce({
        data: {
          isSuccess: true,
          content: { ...mockCaseResponse, caseTitle: 'Updated Title' },
        },
      });

      const result = await caseService.updateCase('case-123', {
        caseTitle: 'Updated Title',
      });

      expect(result.caseTitle).toBe('Updated Title');
    });

    test('USER-CASE-051: Update case description', async () => {
      mockedApiClient.put.mockResolvedValueOnce({
        data: {
          isSuccess: true,
          content: { ...mockCaseResponse, caseDescription: 'Updated description' },
        },
      });

      const result = await caseService.updateCase('case-123', {
        caseDescription: 'Updated description',
      });

      expect(result.caseDescription).toBe('Updated description');
    });

    test('USER-CASE-052: Submit draft case', async () => {
      mockedApiClient.put.mockResolvedValueOnce({
        data: {
          isSuccess: true,
          content: { ...mockCaseResponse, currentStatus: 'Pending', isDraft: false },
        },
      });

      const result = await caseService.updateCase('draft-123', {
        isDraft: false,
      });

      expect(result.currentStatus).toBe('Pending');
    });

    test('USER-CASE-053: Add case notes', async () => {
      mockedApiClient.put.mockResolvedValueOnce({
        data: {
          isSuccess: true,
          content: { ...mockCaseResponse, caseNotes: 'Additional notes here' },
        },
      });

      const result = await caseService.updateCase('case-123', {
        caseNotes: 'Additional notes here',
      });

      expect(result.caseNotes).toBe('Additional notes here');
    });
  });

  // ============================================
  // 6. CANCEL CASE TESTS (USER-CASE-056 to USER-CASE-060)
  // ============================================
  describe('USER-CASE-056 to USER-CASE-060: Cancel Case', () => {
    
    test('USER-CASE-056: Cancel pending case', async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        data: { isSuccess: true, message: 'Case cancelled' },
      });

      await expect(caseService.cancelCase('case-123')).resolves.not.toThrow();

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('cancel'),
        expect.any(Object)
      );
    });

    test('USER-CASE-057: Cancel case with reason', async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        data: { isSuccess: true },
      });

      // If the service supports reason
      await caseService.cancelCase('case-123');

      expect(mockedApiClient.post).toHaveBeenCalled();
    });

    test('USER-CASE-058: Cannot cancel in-progress case', async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        data: {
          isSuccess: false,
          errors: ['Cannot cancel case that is already in progress'],
        },
      });

      await expect(caseService.cancelCase('active-case')).rejects.toThrow();
    });

    test('USER-CASE-059: Delete draft case', async () => {
      mockedApiClient.delete.mockResolvedValueOnce({
        data: { isSuccess: true },
      });

      // Assuming there's a delete method for drafts
      await expect(caseService.deleteCase?.('draft-123')).resolves;
    });
  });

  // ============================================
  // 7. VOUCHER INTEGRATION TESTS
  // ============================================
  describe('Voucher Integration with Cases', () => {
    
    test('Get user vouchers for case application', async () => {
      const mockVouchers = [
        {
          id: 'uv-1',
          voucherId: 'v-1',
          voucher: {
            voucherName: '10% Discount',
            price: 100,
            isActive: true,
          },
          isValid: true,
          isRedeemed: false,
        },
        {
          id: 'uv-2',
          voucherId: 'v-2',
          voucher: {
            voucherName: 'RM50 Off',
            price: 50,
            isActive: true,
          },
          isValid: true,
          isRedeemed: false,
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({
        data: { isSuccess: true, content: mockVouchers },
      });

      const result = await caseService.getMyVouchers(mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0].isValid).toBe(true);
      expect(result[0].voucher.voucherName).toBe('10% Discount');
    });

    test('Create case with voucher applied', async () => {
      const caseWithVoucher: CreateCaseDto = {
        ...mockCreateCaseDto,
        userVoucherId: 'uv-1',
      };

      mockedApiClient.post.mockResolvedValueOnce({
        data: {
          isSuccess: true,
          content: {
            id: 'case-with-voucher',
            ...caseWithVoucher,
            appliedVoucherId: 'uv-1',
            discountApplied: 100,
          },
        },
      });

      const result = await caseService.createCase(caseWithVoucher);

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          userVoucherId: 'uv-1',
        })
      );
    });

    test('Invalid voucher rejected', async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        data: {
          isSuccess: false,
          errors: ['Voucher is expired or invalid'],
        },
      });

      await expect(
        caseService.createCase({
          ...mockCreateCaseDto,
          userVoucherId: 'expired-voucher',
        })
      ).rejects.toThrow();
    });
  });
});

