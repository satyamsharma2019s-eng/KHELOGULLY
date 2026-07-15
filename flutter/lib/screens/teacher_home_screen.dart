import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import 'camera_test_screen.dart';

/// Teacher Home Screen — roster from GET /api/v1/enrollments/students.
///
/// Real response shape (confirmed from enrollment.service.js):
/// data = [
///   {
///     athleteId: { _id, name, age, gender, district },
///     studentId: { name, phone },
///     schoolOrRegion, status, enrolledAt,
///     bestScores: { <testType>: { zScore, percentile, rawScore, testDate } }
///   },
///   ...
/// ]
/// (exact wrapper key for bestScores not 100% confirmed past line 156 of the
/// service file — verify against a real response before final polish, but
/// the athleteId/studentId nested shape is confirmed.)
class TeacherHomeScreen extends StatefulWidget {
  const TeacherHomeScreen({
    super.key,
    required this.teacherName,
    required this.schoolOrRegion,
  });

  final String teacherName;
  final String schoolOrRegion;

  @override
  State<TeacherHomeScreen> createState() => _TeacherHomeScreenState();
}

class _TeacherHomeScreenState extends State<TeacherHomeScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<_RosterEntry> _roster = [];
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadRoster();
  }

  Future<void> _loadRoster() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await ApiService.instance.get('/enrollments/students');
      final data = ApiService.instance.unwrap(response) as List;

      final roster = data.map((entry) {
        final athlete = entry['athleteId'] ?? {};
        return _RosterEntry(
          athleteId: athlete['_id'] ?? '',
          name: athlete['name'] ?? 'Unnamed',
          age: athlete['age'] ?? 0,
          gender: athlete['gender'] ?? '',
          district: athlete['district'],
        );
      }).toList();

      if (!mounted) return;
      setState(() {
        _roster = roster;
        _isLoading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.message;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Failed to load roster: $e';
        _isLoading = false;
      });
    }
  }

  List<_RosterEntry> get _filteredRoster {
    if (_searchQuery.trim().isEmpty) return _roster;
    final query = _searchQuery.toLowerCase();
    return _roster.where((s) => s.name.toLowerCase().contains(query)).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Roster')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? _ErrorView(message: _errorMessage!, onRetry: _loadRoster)
              : RefreshIndicator(
                  onRefresh: _loadRoster,
                  child: Column(
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: AppColors.roleTeacher.withOpacity(0.12),
                                    borderRadius: BorderRadius.circular(AppRadius.md),
                                  ),
                                  child: const Icon(
                                    Icons.school_rounded,
                                    color: AppColors.roleTeacher,
                                  ),
                                ),
                                const SizedBox(width: AppSpacing.md),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(widget.teacherName, style: AppTextStyles.cardTitle),
                                      Text(widget.schoolOrRegion,
                                          style: AppTextStyles.cardSubtitle),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: AppSpacing.lg),
                            TextField(
                              onChanged: (value) => setState(() => _searchQuery = value),
                              decoration: const InputDecoration(
                                hintText: 'Search student by name',
                                prefixIcon: Icon(Icons.search_rounded),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: _filteredRoster.isEmpty
                            ? const _EmptyRoster()
                            : ListView.separated(
                                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                                itemCount: _filteredRoster.length,
                                separatorBuilder: (_, __) =>
                                    const SizedBox(height: AppSpacing.sm),
                                itemBuilder: (context, index) {
                                  final student = _filteredRoster[index];
                                  return _RosterTile(
                                    student: student,
                                    onRunTest: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (context) => CameraTestScreen(
                                            studentId: student.athleteId,
                                            studentName: student.name,
                                          ),
                                        ),
                                      );
                                    },
                                  );
                                },
                              ),
                      ),
                    ],
                  ),
                ),
    );
  }
}

class _RosterEntry {
  final String athleteId;
  final String name;
  final int age;
  final String gender;
  final String? district;

  _RosterEntry({
    required this.athleteId,
    required this.name,
    required this.age,
    required this.gender,
    this.district,
  });
}

class _RosterTile extends StatelessWidget {
  final _RosterEntry student;
  final VoidCallback onRunTest;

  const _RosterTile({required this.student, required this.onRunTest});

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
          CircleAvatar(
            radius: 22,
            backgroundColor: AppColors.roleTeacher.withOpacity(0.15),
            child: Text(
              student.name.isNotEmpty ? student.name[0].toUpperCase() : '?',
              style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.roleTeacher),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(student.name, style: AppTextStyles.cardTitle),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  '${student.age} yrs • ${student.gender}${student.district != null ? ' • ${student.district}' : ''}',
                  style: AppTextStyles.cardSubtitle,
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: onRunTest,
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(0, 38),
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
            ),
            child: const Text('Run Test'),
          ),
        ],
      ),
    );
  }
}

class _EmptyRoster extends StatelessWidget {
  const _EmptyRoster();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.groups_outlined, size: 48, color: AppColors.textSecondary),
            const SizedBox(height: AppSpacing.md),
            const Text('No students found', style: AppTextStyles.cardTitle),
            const SizedBox(height: AppSpacing.xs),
            const Text(
              'Students who enroll in your school/region will appear here',
              textAlign: TextAlign.center,
              style: AppTextStyles.cardSubtitle,
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded, size: 40, color: AppColors.error),
            const SizedBox(height: AppSpacing.md),
            Text(message, textAlign: TextAlign.center, style: AppTextStyles.cardSubtitle),
            const SizedBox(height: AppSpacing.md),
            ElevatedButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
