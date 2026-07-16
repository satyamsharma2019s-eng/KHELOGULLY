import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../models/app_models.dart';
import '../services/api_service.dart';
import 'enroll_screen.dart';

/// Student Home Screen
/// Shows: own profile, list of enrollments (a student can have more than
/// one — show all), and own test scores.
///
/// Wired to real backend:
///   GET /api/v1/student/enrollments
///   GET /api/v1/student/scores
/// Auth interceptor (refresh-retry on 401) confirmed working before wiring.
class StudentHomeScreen extends StatefulWidget {
  const StudentHomeScreen({
    super.key,
    required this.studentName,
  });

  final String studentName;

  @override
  State<StudentHomeScreen> createState() => _StudentHomeScreenState();
}

class _StudentHomeScreenState extends State<StudentHomeScreen> {
  bool _isLoading = true;
  List<EnrollmentModel> _enrollments = [];
  List<TestResultModel> _scores = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);

    try {
      final enrollmentsResponse =
          await ApiService.instance.get('/student/enrollments');
      final enrollmentsData = ApiService.instance.unwrap(enrollmentsResponse);
      _enrollments = (enrollmentsData as List)
          .map((e) => EnrollmentModel.fromJson(e as Map<String, dynamic>))
          .where((e) => e.status == 'active')
          .toList();

      final scoresResponse = await ApiService.instance.get('/student/scores');
      final scoresData = ApiService.instance.unwrap(scoresResponse);
      _scores = (scoresData as List)
          .map((s) => TestResultModel.fromJson(s as Map<String, dynamic>))
          .toList();
    } on ApiException catch (e) {
      debugPrint('Load failed: ${e.message}');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
      }
    } catch (e) {
      debugPrint(e.toString());
    }

    if (!mounted) return;

    setState(() {
      _isLoading = false;
    });
  }

  Future<void> _handleWithdraw(EnrollmentModel enrollment) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Withdraw enrollment?'),
        content: Text(
          'You will be removed from "${enrollment.schoolOrRegion}". This cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text(
              'Withdraw',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isLoading = true);

    try {
      final response =
          await ApiService.instance.delete('/enrollments/${enrollment.id}');
      ApiService.instance.unwrap(response);

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Withdrawn successfully')),
      );

      await _loadData();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message)),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Something went wrong. Please try again.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Profile'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.all(AppSpacing.lg),
                children: [
                  _ProfileHeader(name: widget.studentName),
                  const SizedBox(height: AppSpacing.xl),

                  _SectionHeader(
                    title: 'My Enrollments',
                    actionLabel: 'Enroll',
                    onAction: () async {
                      final enrolled = await Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const EnrollScreen(),
                        ),
                      );

                      if (enrolled == true) {
                        _loadData();
                      }
                    },
                  ),
                  const SizedBox(height: AppSpacing.md),
                  if (_enrollments.isEmpty)
                    const _EmptyState(
                      icon: Icons.location_on_outlined,
                      message: 'You haven\'t enrolled in any region yet',
                    )
                  else
                    ..._enrollments.map(
                      (e) => Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                        child: _EnrollmentTile(
                          enrollment: e,
                          onWithdraw: () => _handleWithdraw(e),
                        ),
                      ),
                    ),

                  const SizedBox(height: AppSpacing.xl),

                  const _SectionHeader(title: 'My Scores'),
                  const SizedBox(height: AppSpacing.md),
                  if (_scores.isEmpty)
                    const _EmptyState(
                      icon: Icons.bar_chart_rounded,
                      message: 'No test results yet',
                    )
                  else
                    ..._scores.map(
                      (s) => Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                        child: _ScoreTile(result: s),
                      ),
                    ),
                ],
              ),
            ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  final String name;
  const _ProfileHeader({required this.name});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        CircleAvatar(
          radius: 32,
          backgroundColor: AppColors.roleStudent.withOpacity(0.15),
          child: Text(
            name.isNotEmpty ? name[0].toUpperCase() : '?',
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: AppColors.roleStudent,
            ),
          ),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(name, style: AppTextStyles.heading2),
              const SizedBox(height: AppSpacing.xs),
              const Text('Student', style: AppTextStyles.subtitle),
            ],
          ),
        ),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  const _SectionHeader({
    required this.title,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        if (actionLabel != null)
          TextButton.icon(
            onPressed: onAction,
            icon: const Icon(Icons.add_rounded, size: 18),
            label: Text(actionLabel!),
            style: TextButton.styleFrom(foregroundColor: AppColors.primary),
          ),
      ],
    );
  }
}

class _EnrollmentTile extends StatelessWidget {
  final EnrollmentModel enrollment;
  final VoidCallback onWithdraw;

  const _EnrollmentTile({
    required this.enrollment,
    required this.onWithdraw,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          const Icon(Icons.location_on_rounded, color: AppColors.secondary, size: 20),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              enrollment.schoolOrRegion,
              style: AppTextStyles.cardTitle,
            ),
          ),
          IconButton(
            onPressed: onWithdraw,
            icon: const Icon(Icons.close_rounded, size: 20),
            color: AppColors.textSecondary,
            tooltip: 'Withdraw',
          ),
        ],
      ),
    );
  }
}

class _ScoreTile extends StatelessWidget {
  final TestResultModel result;
  const _ScoreTile({required this.result});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(AppRadius.sm),
            ),
            child: const Icon(
              Icons.fitness_center_rounded,
              color: AppColors.primary,
              size: 20,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(result.displayTestType, style: AppTextStyles.cardTitle),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  '${result.rawScore} ${result.unit}',
                  style: AppTextStyles.cardSubtitle,
                ),
              ],
            ),
          ),
          // Null-safe: percentile may not exist until baseline table is seeded
          if (result.percentile != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.secondary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: Text(
                '${result.percentile!.toStringAsFixed(0)}th %ile',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.secondary,
                ),
              ),
            )
          else
            const Text(
              'Pending',
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String message;
  const _EmptyState({required this.icon, required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xl),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Icon(icon, size: 32, color: AppColors.textSecondary),
          const SizedBox(height: AppSpacing.sm),
          Text(
            message,
            style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}
