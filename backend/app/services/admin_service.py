from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, status

from ..models.models import City, Role, Permission
from ..schemas.schemas import CityCreate, CityUpdate, RoleCreate, RoleUpdate

class AdminService:
    @staticmethod
    def get_all_permissions(db: Session):
        return db.query(Permission).all()

    @staticmethod
    def get_roles(db: Session, active_only: bool):
        query = db.query(Role)
        if active_only:
            query = query.filter(Role.is_active == True)
        return query.all()

    @staticmethod
    def create_role(db: Session, role_in: RoleCreate):
        if db.query(Role).filter(Role.slug == role_in.slug).first():
            raise HTTPException(status_code=400, detail="Role slug already exists")
        
        new_role = Role(
            name=role_in.name,
            slug=role_in.slug,
            is_active=role_in.is_active
        )
        
        if role_in.permission_ids:
            perms = db.query(Permission).filter(Permission.id.in_(role_in.permission_ids)).all()
            new_role.permissions = perms
        
        db.add(new_role)
        db.commit()
        db.refresh(new_role)
        return new_role

    @staticmethod
    def update_role(db: Session, role_id: int, role_in: RoleUpdate):
        role = db.query(Role).filter(Role.id == role_id).first()
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
            
        if role.slug in ['admin', 'customer', 'vendor'] and role_in.slug and role_in.slug != role.slug:
            raise HTTPException(status_code=400, detail="Cannot change slug of system roles")

        if role.id in (1, 2, 3) and role_in.is_active is False:
            raise HTTPException(status_code=400, detail="System roles cannot be disabled")

        if role_in.name: role.name = role_in.name
        if role_in.slug: role.slug = role_in.slug
        if role_in.is_active is not None: role.is_active = role_in.is_active
        
        if role_in.permission_ids is not None:
            perms = db.query(Permission).filter(Permission.id.in_(role_in.permission_ids)).all()
            role.permissions = perms
            
        db.commit()
        db.refresh(role)
        return role

    @staticmethod
    def add_city(db: Session, city_in: CityCreate):
        existing_city = db.query(City).filter(
            or_(City.name == city_in.name, City.alias == city_in.alias)
        ).first()
        
        if existing_city:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="City name or Alias already exists")

        db_city = City(
            name=city_in.name, 
            alias=city_in.alias,
            is_active=city_in.is_active
        )
        db.add(db_city)
        db.commit()
        db.refresh(db_city)
        return db_city

    @staticmethod
    def list_cities(db: Session):
        return db.query(City).all()

    @staticmethod
    def update_city(db: Session, city_id: int, city_update: CityUpdate):
        db_city = db.query(City).filter(City.id == city_id).first()
        if not db_city:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")

        if city_update.alias and city_update.alias != db_city.alias:
            existing_alias = db.query(City).filter(City.alias == city_update.alias).first()
            if existing_alias:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug is already taken by another city")

        if city_update.name is not None:
            db_city.name = city_update.name
        if city_update.alias is not None:
            db_city.alias = city_update.alias
        if city_update.is_active is not None:
            db_city.is_active = city_update.is_active

        db.commit()
        db.refresh(db_city)
        return db_city

    @staticmethod
    def toggle_city_status(db: Session, city_id: int):
        db_city = db.query(City).filter(City.id == city_id).first()
        if not db_city:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")

        db_city.is_active = not db_city.is_active
        db.commit()
        db.refresh(db_city)
        return db_city
