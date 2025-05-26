import csv
from django.core.management.base import BaseCommand
from samples.models import AliasMapping

class Command(BaseCommand):
    help = 'Upload alias mapping CSV and populate AliasMapping model'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Path to the alias_mapping CSV file')

    def handle(self, *args, **kwargs):
        csv_path = kwargs['csv_file']
        with open(csv_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                alias_name = row['alias_name'].strip()
                test_type_keywords = row['test_type_keywords'].strip()

                obj, created = AliasMapping.objects.update_or_create(
                    alias_name=alias_name,
                    defaults={'test_type_keywords': test_type_keywords}
                )
                self.stdout.write(self.style.SUCCESS(
                    f"{'Created' if created else 'Updated'} alias: {alias_name}"
                ))
