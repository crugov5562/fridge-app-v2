-- оставляем только: кг, г, л, шт
delete from measurement_units
where abbreviation not in ('кг', 'г', 'л', 'шт');
