import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../models/app_models.dart';
import 'camera_test_screen.dart';

/// Teacher Home Screen
/// Roster is pulled ONLY from GET /api/v1/enrollments/students.
/// Never fetch or display the full athlete list here — any student not on
/// this pre-filtered roster will fail with 403 FORBIDDEN if a result is
/// submitted for them, so the UI must make that case impossible to reach,
/// not just handle the error after the fact.
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
  List<RosterStudentModel> _roster = [];
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadRoster();
  }

  Future<void> _loadRoster() async {
    setState(() => _isLoading = true);

    // TODO: replace with real GET /api/v1/enrollments/students
    // This endpoint already scopes to the teacher's own schoolOrRegion —
    // do not attempt to query all athletes from any other endpoint.
    await Future.delayed(const Duration(milliseconds: 600));

    // ---- MOCK DATA (remove once real API is wired) ----
    final mockRoster = [
      RosterStudentModel(
        id: '1',
        name: 'Aarav Sharma',
        age: 14,
        gender: 'Male',
        village: 'Bargi',
        enrolledAt: DateTime.now().subtract(const Duration(days: 12)),
      ),
      RosterStudentModel(
        id: '2',
        name: 'Priya Patel',
        age: 13,
        gender: 'Female',
        village: 'Sihora',
        enrolledAt: DateTime.now().subtract(const Duration(days: 8)),
      ),
      RosterStudentModel(
        id: '3',
        name: 'Rohan Verma',
        age: 15,
        gender: 'Male',
        village: 'Bargi',
        enrolledAt: DateTime.now().subtract(const Duration(days: 5)),
      ),
    ];
    // ---- END MOCK DATA ----

    if (!mounted) return;
    setState(() {
      _roster = mockRoster;
      _isLoading = false;
    });
  }

  List<RosterStudentModel> get _filteredRoster {
    if (_searchQuery.trim().isEmpty) return _roster;
    final query = _searchQuery.toLowerCase();
    return _roster.where((s) => s.name.toLowerCase().contains(query)).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Roster'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
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
                                  Text(
                                    widget.schoolOrRegion,
                                    style: AppTextStyles.cardSubtitle,
                                  ),
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
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.lg,
                            ),
                            itemCount: _filteredRoster.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: AppSpacing.sm),
                            itemBuilder: (context, index) {
                              final student = _filteredRoster[index];
                              return _RosterTile(
                                student: student,
                                onRunTest: () {
                                  // Only students already on this pre-filtered
                                  // roster can reach this point — the 403 case
                                  // is structurally impossible from this UI.
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => CameraTestScreen(
                                        studentId: student.id,
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

class _RosterTile extends StatelessWidget {
  final RosterStudentModel student;
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
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                color: AppColors.roleTeacher,
              ),
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
                  '${student.age} yrs • ${student.gender}${student.village != null ? ' • ${student.village}' : ''}',
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
            const Icon(
              Icons.groups_outlined,
              size: 48,
              color: AppColors.textSecondary,
            ),
            const SizedBox(height: AppSpacing.md),
            const Text(
              'No students found',
              style: AppTextStyles.cardTitle,
            ),
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
