import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import { UsersService } from '../users/users.service';
import { apiReturner } from 'src/shared/returnerApi';
import {
  EMAIL_PASS_INVALID,
  INVALID_CREDENTIALS,
  INVALID_SIRET_CODE,
  MAIL_SENT,
  PAYMENT_REQUIRED,
  SOMETHING_WENT_WRONG,
  SUCCEEDED,
} from 'src/constantes/constantes';

import {
  EmailVerifDto,
  referralCodeSenderDto,
  RegisterUserByAdminDto,
  RegisterUserDto,
} from './dto/createUserDto';
import { SignInUserDto } from './dto/signIn.tdo';
import { ForgetPasswordDto } from './dto/forgetUserDto';
import { MailService } from 'src/mailling/mail.service';
import { UserToken } from 'src/shared/tokenModel';
import { privilege, uPhotos } from 'src/shared/enums';
import { ResetPasswordDto } from './dto/resetPassDto';
import { OneLevelDto, ThreeLevelDto, TowLevelDto } from './dto/one.level.dto';
import { CategoryService } from '../category/category.service';

import { CompanyService } from '../companies/company.service';
import { FilesS3Service } from './s3.service';
import { PrestationService } from '../prestation/prestation.service';
import { CreatePrestationDto } from '../prestation/prestation.dto';
import { CreateCategoryDto } from '../category/dto/create-category.dto';
import { LevelEightDto } from './dto/levelEightDto';
import { User } from '../users/models/user.model';
import { v4 as uuidv4 } from 'uuid';
import { WalletService } from '../wallet/wallet.service';

import { Exceptionlookup } from 'src/shared/handling.error.message';
import Stripe from 'stripe';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
    // private adminService: AdminService,
    private CompanyService: CompanyService,
    private readonly categoryService: CategoryService,
    private readonly filesService: FilesS3Service,
    private readonly prestationService: PrestationService,
    private readonly walletService: WalletService,
  ) { }

  async updateStep(email: string, step: number) {
    return await this.usersService.updateStep(email, step);
  }
  // signInAdmin(userName: string, password: string) {
  //   const result = this.adminService.signInService(userName, password);
  //   if (result) {
  //     return this.jwtService.sign({ _id: 'Admin', role: privilege.ADMIN });
  //   } else {
  //     throw new UnauthorizedException(
  //       apiReturner(HttpStatus.UNAUTHORIZED, SOMETHING_WENT_WRONG),
  //     );
  //   }
  // }
  async validateUser(userData: SignInUserDto) {
    console.log('userData');
    console.log(userData.email, userData.notificationDeviceToken);

    const { notificationDeviceToken } = userData;
    const logged = await this.usersService.signInUser(userData);

    if (logged?.deleted == true)
      throw new HttpException(
        apiReturner(HttpStatus.FORBIDDEN, EMAIL_PASS_INVALID + ' ' + logged),
        HttpStatus.FORBIDDEN,
      );
    if (logged?.active == false)
      throw new HttpException(
        apiReturner(HttpStatus.METHOD_NOT_ALLOWED, "account suspended"),
        HttpStatus.METHOD_NOT_ALLOWED,
      );

    if (logged == undefined || logged == null) {
      throw new HttpException(
        apiReturner(HttpStatus.FORBIDDEN, EMAIL_PASS_INVALID + '   ' + logged),

        HttpStatus.FORBIDDEN,
      );

      //****************************** */
      //
    } else if (logged.accountVerified == false) {
      console.log('heeeer');
      throw new HttpException(
        'you should activate your account via email',
        HttpStatus.PAYMENT_REQUIRED,
        //!406 status code
      );
    } else {
      if (notificationDeviceToken) {
        // const exist = logged.notificationDeviceToken.some(
        //   (data) => data == notificationDeviceToken,
        // );
        // if (exist == false) {

        const auup = await this.usersService.updateServices(
          logged._id,
          {
            //$push: {
            notificationDeviceToken: [notificationDeviceToken],
            platform: userData.platform
          },
          //}
        );
        console.log('updateeeeeeeeeed', auup);
      }
      //}

      const payload = {
        _id: logged._id,
        role: logged.type,
      };
      //        .populate({ path: 'to', populate: { path: 'relatedCompany' } })
      const token = this.jwtService.sign(payload);
      let user = await logged.populate([
        'userAgenda',
        'relatedCompany.prestations',
        'relatedCompany.employees',
        { path: 'relatedCompany.employees', populate: 'userAgenda' },
        {
          path: 'relatedCompany.categories',
        },
      ]);

      if (user.type == privilege.CLIENT) {
        // console.log('client');

        return apiReturner(HttpStatus.CREATED, SUCCEEDED, {
          user,
          token: token,
        });
      } else if (user.type == privilege.PRO) {
        //console.log('pro');
        if (user.subscription != null) {
          return apiReturner(HttpStatus.CREATED, SUCCEEDED, {
            user,
            token: token,
          });
        } else {
          throw new HttpException(
            apiReturner(HttpStatus.NOT_ACCEPTABLE, PAYMENT_REQUIRED, {
              token: token,
              _id: logged._id,
              firstName: logged.firstName,
              lastname: logged.lastName,
              type: logged.type,
            }),
            HttpStatus.NOT_ACCEPTABLE,
          );
        }
      } else {
        //console.log('emp');
        /* fetch the pro subscription */
        const pro_data = await this.usersService.fetchProSub(
          {},
          user?.relatedCompany?.reletedTo,
        );
        user.no_show = pro_data.data.no_show;
        return apiReturner(HttpStatus.CREATED, SUCCEEDED, {
          user,
          token: token,
        });
      }
    }
  }
  // ! user registration

  async registerUserService(
    userData?: RegisterUserDto,
    userDataByAdmin?: RegisterUserByAdminDto,
  ) {
    try {
      if (userDataByAdmin != null && userDataByAdmin.addedByAdmin == true) {
        userDataByAdmin["active"] = true;
        return await this.usersService.registerUserByAdminService(
          userDataByAdmin,
        );
      } else {
        if (!userData.siretNumber && userData.type == privilege.PRO) {
          throw new InternalServerErrorException(
            apiReturner(HttpStatus.INTERNAL_SERVER_ERROR, INVALID_SIRET_CODE),
          );
        }

        return await this.usersService.registerUserService(
          userData,
          this.jwtService,
        );
      }
    } catch (e) {
      console.log(e);
      throw new HttpException(
        'some user information are not valid or email already existe or ' + e,
        HttpStatus.CONFLICT,
      );
    }
  }

  async verifiedAccountService(_id: string) {
    const user = await this.usersService.findUserBy({ _id });
    if (!user) {
      throw new InternalServerErrorException(
        apiReturner(HttpStatus.INTERNAL_SERVER_ERROR, INVALID_CREDENTIALS),
      );
    }
    await this.usersService.UpdateUserById(_id, { accountVerified: true });
    return apiReturner(HttpStatus.OK, SUCCEEDED);
  }

  async getLevelService(user: UserToken) {
    return this.usersService.getLevelService(user._id);
  }
  async addingLevelService(user: UserToken, configurationLevel: number) {
    return await this.usersService.updateServices(user._id, configurationLevel); 
  }
  //!--------------------------
  async addingLevelServiceOneV22(user: UserToken, categorieList: OneLevelDto) {
    // try {
    let companyCat = [];
    let errors;
    await Promise.all(
      categorieList.categories.map(async (cat) => {
        if (cat.cat_id == null || cat.cat_id == undefined || cat.cat_id == '') {
          const isParent = await this.categoryService.isParent(cat.parent_cat);

          if (isParent == true) {
            const categorie: CreateCategoryDto = {
              imageUrl: null,
              content: JSON.stringify({"fr":cat.cat_name,"en":cat.cat_name,"es":cat.cat_name}),
              name: cat.cat_name,
              parentCategory: cat.parent_cat,
              active: false,
            };
            const newCategorieDemand = await this.categoryService.createFrom(
              categorie,
              null,
            );

            companyCat.push(newCategorieDemand._id);
          } else {
            errors = true;
          }
        } else {
          companyCat.push(cat.cat_id);
        }
      }),
    );

    if (errors) {
      throw new InternalServerErrorException('Invalid parent ID');
    }

    let categories = companyCat;
    const newCompany = { categories, reletedTo: user._id };
    const companyCreated = await this.CompanyService.createWithUpsertCompany(
      user._id,
      newCompany,
    );
    if (companyCreated) {
      const updatedUser = await this.usersService.updateServices(user._id, {
        relatedCompany: companyCreated._id,
        configurationLevel: 2,
      });
      if (updatedUser) {

        return apiReturner(HttpStatus.CREATED, SUCCEEDED, { relatedCompany: companyCreated._id });
      } else {
        throw new Error('User_Not_Updated');
      }
    } else {
      throw new Error('Company not created');
    }

    //!--------

    //!----------------------------------------------------------------------------------------------
  }
  //

  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  async addingLevelServiceOne(user: UserToken, level: OneLevelDto) {
    if (level.categories.length > 2) {
      throw new InternalServerErrorException('type_mismatch');
    }
    if (level.categories.length == 1) {
      if (
        level.categories[0].parent_cat &&
        level.categories[0].cat_id &&
        level.categories[0].cat_name == null
      ) {
        console.log('heeeeeeeeeeeeer');
        let categories = [level.categories[0].cat_id];
        const newReletedCompany = { categories, reletedTo: user._id };
        const result = await this.CompanyService.createWithUpsertCompany(
          user._id,
          newReletedCompany,
        );
        if (result) {
          console.log('h1', { relatedCompany: result._id });
          const updatedUser = await this.usersService.updateServices(user._id, {
            relatedCompany: result._id,
            configurationLevel: 2,
          });
          if (updatedUser) {
            return apiReturner(HttpStatus.CREATED, SUCCEEDED);
          } else {
            throw new InternalServerErrorException('User_Not_Updated');
          }
        } else {
          throw new InternalServerErrorException('Company_Does_Not_created');
        }
      } else {
        throw new InternalServerErrorException('add_at_least_subCat');
      }
    } else if (level.categories.length < 1) {
      throw new InternalServerErrorException('Please_add_at_least_a _subCat');
    }

    //!--------
    else if (level.categories.length == 2) {
      if (!level.categories[0].cat_id && !level.categories[0 + 1].cat_id) {
        throw new InternalServerErrorException('add at least a subCat');
      }

      if (!level.categories[0].cat_id && level.categories[0 + 1].cat_id) {
        const categorie: CreateCategoryDto = {
          imageUrl: null,
          content: null,
          name: level.categories[0].cat_name,
          parentCategory: level.categories[0].parent_cat,
          active: false,
        };
        const newCategorieDemend = await this.categoryService.create(
          categorie,
          null,
        );

        let categories = [
          level.categories[0 + 1].cat_id,
          newCategorieDemend._id,
        ];
        const newReletedCompany = { categories, reletedTo: user._id };
        const result = await this.CompanyService.createWithUpsertCompany(
          user._id,
          newReletedCompany,
        );

        if (result) {
          console.log('h44', { relatedCompany: result._id });

          const updatedUser = await this.usersService.updateServices(user._id, {
            relatedCompany: result._id,
            configurationLevel: 2,
          });

          if (updatedUser) {
            console.log('h2', { relatedCompany: result._id });
            return apiReturner(HttpStatus.CREATED, SUCCEEDED, { relatedCompany: result._id });
          } else {
            throw new InternalServerErrorException('User_Not_Updated');
          }
        } else {
          throw new InternalServerErrorException('Company_Does_Not_created');
        }
      } else if (level.categories[0].cat_id && level.categories[0 + 1].cat_id) {
        let categories = [
          level.categories[0].cat_id,
          level.categories[0 + 1].cat_id,
        ];
        const newReletedCompany = { categories, reletedTo: user._id };
        const result = await this.CompanyService.createWithUpsertCompany(
          user._id,
          newReletedCompany,
        );

        if (result) {
          console.log('h33', { relatedCompany: result._id });

          const updatedUser = await this.usersService.updateServices(user._id, {
            relatedCompany: result._id,
            configurationLevel: 2,
          });

          if (updatedUser) {
            console.log('h3', { relatedCompany: result._id });
            return apiReturner(HttpStatus.CREATED, SUCCEEDED, { relatedCompany: result._id });
          } else {
            throw new InternalServerErrorException('User_Not_Updated');
          }
        } else {
          throw new InternalServerErrorException('Company_Does_Not_created');
        }
      } else {
        const categorie: CreateCategoryDto = {
          imageUrl: null,
          content: null,
          name: level.categories[0 + 1].cat_name,
          parentCategory: level.categories[0 + 1].parent_cat,
          active: false,
        };
        const newCategorieDemend = await this.categoryService.create(
          categorie,
          null,
        );
        let categories = [level.categories[0].cat_id, newCategorieDemend._id];
        const newReletedCompany = { categories, reletedTo: user._id };
        const result = await this.CompanyService.createWithUpsertCompany(
          user._id,
          newReletedCompany,
        );
        if (result) {
          const updatedUser = await this.usersService.updateServices(user._id, {
            relatedCompany: result._id,
            configurationLevel: 2,
          });
          if (updatedUser) {
            console.log('h4', { relatedCompany: result._id });

            return apiReturner(HttpStatus.CREATED, SUCCEEDED, {
              relatedCompany: result._id,
            });
          } else {
            throw new InternalServerErrorException('User_Not_Updated');
          }
        } else {
          throw new InternalServerErrorException('Company_Does_Not_created');
        }
      }
    }
    //!----------------------------------------------------------------------------------------------
    else {
      throw new InternalServerErrorException(
        apiReturner(HttpStatus.INTERNAL_SERVER_ERROR, SOMETHING_WENT_WRONG),
      );
    }

    // this.categoryService;
    //return this.usersService.updateServices(user._id, cLevel);
  }
  //

  async addingLevelServiceThree(user: UserToken, level: ThreeLevelDto) {
    const result = await this.CompanyService.updateCompany(user._id, level);
    console.log('Location new : ****************', level.address.location);

    if (result) {
      await this.usersService.updateServices(user._id, {
        configurationLevel: 4,
      });
      return apiReturner(HttpStatus.CREATED, SUCCEEDED);
    } else {
      throw new InternalServerErrorException(INVALID_CREDENTIALS);
    }
  }

  async addingLevelServiceFour(user: UserToken, newPres: CreatePrestationDto) {
    let table = [];
    const company = await this.CompanyService.getCompanyByUserId(user._id);
    for (let i = 0; i < newPres.listeOfPrestation.length; i++) {
      if (!newPres.listeOfPrestation[i]._id) {
        const idprestation = await this.prestationService.create(
          newPres.listeOfPrestation[i],
          company._id,
        );

        table.push(idprestation);
        await this.usersService.updateServices(user._id, {
          configurationLevel: 5,
        });
      } else {
        const getRestOfpres =
          await this.prestationService.updateOrCreatePrestation(
            company._id,
            newPres.listeOfPrestation[i],
          );
        table.push(getRestOfpres._id);
        await this.usersService.updateServices(user._id, {
          configurationLevel: 5,
        });

        // const result = await this.prestationService.update(newPres);
        // if (result) {
        //   return apiReturner(HttpStatus.CREATED.toString(), SUCCEEDED);
        // } else {
        //   throw new InternalServerErrorException('update_failed');
        // }
      }
    }
    const finish = await this.CompanyService.updateCompany(user._id, {
      prestations: table,
    });
    const finalpresliste = await this.prestationService.findAllPress(
      company._id,
      table,
    );
    return apiReturner(HttpStatus.CREATED, SUCCEEDED, finalpresliste);
  }
  //
  //!--------------------------

  async resendEmailService(user: User) {
    const token = await this.jwtService.sign({
      _id: user._id,
      sub: null,
      role: user.type,
    });
    return await this.mailService.sendEmailForAccountVerification(user, token);
  }
  //!--------------------------------------
  async forgetPasswordService(forgetPasswordDto: ForgetPasswordDto) {
    const user = await this.usersService.findUserBy({
      email: forgetPasswordDto.email,
    });
    if (!user) {
      return apiReturner(HttpStatus.CREATED, SUCCEEDED);
    } else {
      const payload = { _id: user._id, role: user.type };
      const token = this.jwtService.sign(payload);
      await this.mailService.sendEmailForForgettenPassword(user, token);

      return apiReturner(HttpStatus.CREATED, MAIL_SENT);
    }
  }

  async updatePasswordPremissionService(token: string) {
    const user = this.jwtService.decode(token) as UserToken;

    await this.usersService.updateServices(user._id, {
      ableToChangePassword: true,
    });

    return null;
  }
  async updatePasswordService(token: string, password: ResetPasswordDto) {
    const user = this.jwtService.decode(token) as UserToken;

    const done = await this.usersService.updateServices(user._id, {
      ...password,
    });

    if (done) {
      return apiReturner(HttpStatus.CREATED, SUCCEEDED);
    } else {
      throw new InternalServerErrorException();
    }
  }
  async deleteUserService(email: string) {
    return await this.usersService.deleteUserservice(email);
  }

  //
  //
  //
  //
  //
  //
  //

  async addAvatar(
    userId: string,
    filename: string,
    rest: TowLevelDto,
    imageBuffer?: Buffer,
  ) {
    if (filename) {
      const { Location } = await this.filesService.uploadFile(
        imageBuffer,
        filename,
      );

      const isDone = await this.CompanyService.updateCompany(userId, {
        companyLogo: Location.split('com/')[1],
        ...rest,
      });
      if (isDone) {
        await this.usersService.updateServices(userId, {
          jobTitle: rest.jobTitle,
          companyName: rest.companyName,
          configurationLevel: 3,
        });
        return apiReturner(HttpStatus.CREATED, SUCCEEDED);
      } else {
        throw new InternalServerErrorException();
      }
    } else {
      const isDone = await this.CompanyService.updateCompany(userId, {
        companyLogo: null,
        ...rest,
      });
      if (isDone) {
        await this.usersService.updateServices(userId, {
          jobTitle: rest.jobTitle,
          companyName: rest.companyName,
          configurationLevel: 3,
        });
        return apiReturner(HttpStatus.CREATED, SUCCEEDED);
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  async addingLevelServiceSeven(user, createLevelSeven) {
    await this.CompanyService.updateCompany(user._id, createLevelSeven);
    await this.usersService.updateServices(user._id, {
      configurationLevel: 8,
    });
    return apiReturner(HttpStatus.CREATED, SUCCEEDED);
  }

  async addingLevelServiceNine(user) {
    const stripe = new Stripe(process.env.STRIPE, {
      apiVersion: '2022-08-01',
    });
    /* fetch user data */
    const user_data = await this.usersService.findUserAndPopulate({_id:user._id})
    const account = await stripe.accounts.create({
      country: 'FR',
      type: 'standard',
      business_type: 'individual',
      email:user_data.email,
      company:{address:{line1:user_data?.relatedCompany?.address.name},name:user_data?.relatedCompany?.companyName},
    });
    
    await this.usersService.UpdateUserById(user_data._id,{stripe_account_id:account.id})
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.SERVER_URI_CONNECT}?acc_id=${account.id}&id=${user._id}&failed=true`,
      return_url: `${process.env.SERVER_URI_CONNECT}?acc_id=${account.id}&id=${user._id}`,
      type: 'account_onboarding',
    });
    if (process.env.NODE_ENV == "dev") {
      return apiReturner(HttpStatus.CREATED, SUCCEEDED, {
        url:`${process.env.SERVER_URI_CONNECT}`,
      }); 
    }
    const url = accountLink.url
    //const url = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${process.env.STRIPE_USER_KEY}&scope=read_write&redirect_uri=${process.env.SERVER_URI_CONNECT}https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${process.env.STRIPE_USER_KEY}&scope=read_write&redirect_uri=${process.env.SERVER_URI_CONNECT}&state=${user._id}`;
    //const url = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${process.env.STRIPE_USER_KEY}&scope=read_write&redirect_uri=${process.env.SERVER_URI_CONNECT}https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${process.env.STRIPE_USER_KEY}&scope=read_write&redirect_uri=${process.env.SERVER_URI_CONNECT}&state=${user._id}`;
    return apiReturner(HttpStatus.CREATED, SUCCEEDED, {
      url:url,
    });
  }

  async addingLevelServiceEleven(user, createlevelEleven) {
    let { hours } = createlevelEleven;
    for (let i = 0; i < hours.length; i++) {
      if (!hours[i]) continue;

      hours[i].day_from_hours = new Date(`1 1,2001 ${hours[i].day_from_hours}`);
      hours[i].day_to_hours = new Date(`1 1,2001 ${hours[i].day_to_hours}`);
      hours[i].mid_day_from_hours = new Date(
        `1 1,2001 ${hours[i].mid_day_from_hours}`,
      );
      hours[i].mid_day_to_hours = new Date(
        `1 1,2001 ${hours[i].mid_day_to_hours}`,
      );
    }

    await this.CompanyService.updateCompany(user._id, createlevelEleven);
    await this.usersService.updateServices(user._id, {
      configurationLevel: 12,
    });
    await this.usersService.updateUserAgend(user, { hours, vacation_from: null, vacation_to: null });

    return apiReturner(HttpStatus.CREATED, SUCCEEDED);
  }
  async addingLevelServiceTwelve(user, files) {
    let files_names = [];
    for (let i = 0; i < files.length; i++) {
      const file_name = uuidv4() + '.jpg';
      files_names.push(file_name);
      await this.filesService.uploadFile(files[i].buffer, file_name);
    }
    await this.CompanyService.updateCompany(user._id, {
      cover_images: files_names,
    });
    //! notify
    await this.usersService.pokeListeAndNotify(user);
    await this.usersService.updateServices(user._id, {
      configurationLevel: 12,
    });

    return apiReturner(HttpStatus.OK, SUCCEEDED);
  }

  async addingLevelServiceFive(
    employee,
    employees_images,
    boutique_images,
    portfolio_images,
    show_public_employees,
    userPro: UserToken,
  ) {
    let image_index = 0;
    if (employee) {
      // for (let i = 0; i < employees_images.length; i++) {
      //   if (!employees_images[i])
      //     continue
      //   const file_name = uuidv4() + '.jpeg';
      //   employee[i].profileImage = file_name;
      //   await this.filesService.uploadFile(
      //     employees_images[i].buffer,
      //     file_name,
      //   );
      // }
      /* fetch current user company */
      const current_company = await this.CompanyService.getCompanyByUserId(
        userPro._id,
      );
      //{"employees":[{"firstName":"houssem1_employee","email":"mail@getMaxListeners.com","has_image":"false"},{"firstName":"houssem2_employee","email":"mail2@getMaxListeners.com","has_image":"true"}]}
      for (let i = 0; i < employee.length; i++) {
        employee[i].relatedCompany = current_company._id;
        if (employee[i].has_image) {
          const file_name = 'emp_image_' + uuidv4() + '.jpeg';
          employee[i].profileImage = file_name;
          await this.filesService.uploadFile(
            employees_images[image_index].buffer,
            file_name,
          );
          image_index++;
        } else {
          employee[i].has_image = null;
          
        }
      }
      const result = await this.usersService.registerEmployeesService(
        employee,
        this.jwtService,
      );
      await this.CompanyService.updateCompany(userPro._id, {
        employees: result,
      });
    }
    let boutique_images_result = [];
    let portfolio_images_result = [];

    if (boutique_images) {
      for (let i = 0; i < boutique_images.length; i++) {
        const file_name = boutique_images[i].originalname + '.jpeg';
        await this.filesService.uploadFile(
          boutique_images[i].buffer,
          file_name,
        );
        boutique_images_result.push(file_name);
      }
    }

    if (portfolio_images) {
      for (let i = 0; i < portfolio_images.length; i++) {
        const file_name = portfolio_images[i].originalname + '.jpeg';
        await this.filesService.uploadFile(
          portfolio_images[i].buffer,
          file_name,
        );
        portfolio_images_result.push(file_name);
      }
    }

    let company_conditions = { show_public_employees };
    company_conditions['boutique_images'] = boutique_images_result;
    company_conditions['portfolio_images'] = portfolio_images_result;

    await this.CompanyService.updateCompany(userPro._id, company_conditions);

    await this.usersService.updateServices(userPro._id, {
      configurationLevel: 7,
    });

    return apiReturner(HttpStatus.OK, SUCCEEDED);
    /* add the users to the company */
  }
  async verifEmail(emailToVerif: EmailVerifDto) {
    const existe = await this.usersService.findUserBy({
      email: emailToVerif.email,
    });
    if (existe) {
      throw new ConflictException();
    } else {
      return apiReturner(HttpStatus.OK, 'This email does not existe , valid', {
        valid: true,
      });
    }
  }

  async addingLevelServiceTen(user: User, emails: referralCodeSenderDto) {
    try {
      let emailToSend: string[] = [];

      const thisUser = await this.usersService.findUserBy({ _id: user._id });
      await Promise.all(
        emails.emails.map(async (email) => {
          const isExist = await this.usersService.findUserBy({ email: email });
          //! if already Referred
          //todo wil change
          // console.log(await this.usersService.isRefferring(user._id, email));
          if (
            isExist == null &&
            !(await this.usersService.isRefferring(user._id, email))
          ) {
            await this.usersService.createRefferring(user._id, email);
            console.log('add');
            emailToSend.push(email);
          } else {
            console.log(email, 'already exist! or already referred!');
          }
        }),
      );
      console.log('emmtosend');
      console.log(emailToSend);
      const locale=user["userLocale"]?user["userLocale"]:"fr"
      const shortLinkWeb =
        process.env.F_URL +locale+
        '/inscription/professionel?Code=' +
        thisUser.referralCode;
      if (emailToSend.length > 0) {
        await this.mailService.sendEmailForReferralCode(
          emailToSend,
          thisUser.referralCodeLink,
          shortLinkWeb,
          thisUser.referralCode
        );
      }

      await this.usersService.updateServices(user._id, {
        configurationLevel: 11,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException(SOMETHING_WENT_WRONG, e);
    }
    return apiReturner(HttpStatus.OK, SUCCEEDED);
  }

  async addingConfigurationlevelEightService(user: User, data: LevelEightDto) {
    try {
      const added = await this.CompanyService.updateCompany(user._id, data);
      if (!added) {
        throw new InternalServerErrorException(SOMETHING_WENT_WRONG);
      }
      await this.usersService.updateServices(user._id, {
        configurationLevel: 9,
      });
    } catch (e) {
      throw new InternalServerErrorException(SOMETHING_WENT_WRONG);
    }
    return apiReturner(HttpStatus.OK, SUCCEEDED);
  }

  async levelTwelveRecapService(user, device) {
    let company_recap;
    /* get user data */
    const user_payload = await this.usersService.findUserAndPopulate({ _id: user._id })
    if (user_payload.type == 'EMPLOYEE')
      user._id = user_payload.relatedCompany.reletedTo;
    if (device == 'MOBILE')
      company_recap = await this.CompanyService.getCompanyForRecap(user._id);
    else company_recap = await this.CompanyService.getCompanyByUserId(user._id);
    /* fetch user */
    const user_data = await this.usersService.findUserBy({ _id: user._id });
    company_recap['stripe_connect'] = user_data.stripe_account_id
      ? true
      : false;
    return apiReturner(HttpStatus.OK, SUCCEEDED, company_recap);
  }
  async updatePhotoService(
    me: UserToken,
    photosListe: any[],
    type: uPhotos,
    show_public_employees?: boolean,
  ) {
    // console.log('photoliste: ', photosListe);
    try {
      switch (type) {
        case uPhotos.BOUTIQUE: {
          let new_boutique_images = [];
          photosListe.push(null);
          //  console.log(photosListe);

          new_boutique_images = await Promise.all(
            photosListe.map(async (photo, index) => {
              if (photo) {
                //  console.log(index);
                //    console.log(photo.originalname);
                const { Location } = await this.filesService.uploadFile(
                  photo.buffer,
                  /^boutique_images/.test(photo.originalname)
                    ? photo.originalname
                    : 'boutique_images_' +
                    me._id +
                    '_' +
                    index.toString() +
                    '.jpeg',
                );
                //   console.log(Location, '---', photo.originalname);

                return Location.split('com/')[1];
              }
            }),
          );
          //  console.log(new_boutique_images);
          // console.log(
          //   new_boutique_images.filter((data) => data != undefined).length > 0,
          // );
          const new_images = new_boutique_images.filter(
            (data) => data != undefined,
          );
          // console.log('new images : ', new_images);

          await this.CompanyService.updateCompany(me._id, {
            boutique_images: new_images,
          });

          return apiReturner(HttpStatus.CREATED, SUCCEEDED);
        }

        case uPhotos.PORTFOILO: {
          let new_portfolio_images = [];
          photosListe.push(null);
          //  console.log(photosListe);
          new_portfolio_images = await Promise.all(
            photosListe.map(async (photo, index) => {
              if (photo != null) {
                // console.log(index);
                // console.log(photo.originalname);
                const { Location } = await this.filesService.uploadFile(
                  photo.buffer,
                  /^boutique_images/.test(photo.originalname)
                    ? photo.originalname
                    : 'portfolio_images_' +
                    me._id +
                    '_' +
                    index.toString() +
                    '.jpeg',
                );
                //    console.log(Location, '---', photo.originalname);

                return Location.split('com/')[1];
                //new_portfolio_images;
              }
            }),
          );

          // console.log(new_portfolio_images);
          // console.log(
          //   new_portfolio_images.filter((data) => data != undefined).length > 0,
          // );
          const new_images = new_portfolio_images.filter(
            (data) => data != undefined,
          );

          await this.CompanyService.updateCompany(me._id, {
            portfolio_images: new_images,
          });

          return apiReturner(HttpStatus.CREATED, SUCCEEDED);
        }
        case uPhotos.TEAM: {
          photosListe.map(
            async (data: { photo: Express.Multer.File; _id: string }) => {
              const { Location } = await this.filesService.uploadFile(
                data.photo.buffer,
                /^emp_image/.test(data.photo.originalname)
                  ? data.photo.originalname
                  : 'emp_image_' + uuidv4() + '.jpeg',
              );
              // console.log(Location, '---', data.photo.originalname);
              await this.CompanyService.updateCompany(me._id, {
                show_public_employees,
              });
              await this.usersService.updateServices(data._id, {
                profileImage: Location.split('com/')[1],
              });
            },
          );
          return apiReturner(HttpStatus.CREATED, SUCCEEDED);
        }
        default:
          throw new HttpException(SOMETHING_WENT_WRONG, HttpStatus.BAD_REQUEST);
      }
    } catch (e) {
      Exceptionlookup(e);
    }
  }
  //
  //!from Walid :✂️- - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - -
  async updateTeamService(
    employee: any,
    employees_images: any,
    show_public_employees: any,
    userPro: UserToken,
  ) {


console.log('ffffmmm',employees_images);



    let image_index = 0;
    // console.log('------------------ -----employee is here -----------');
    // console.log(employee);
    // console.log('----------------------------------------------------');

    const current_company = await this.CompanyService.getCompanyByUserId(
      userPro._id,
    );

    //{"employees":[{"firstName":"houssem1_employee","email":"mail@getMaxListeners.com","has_image":"false"},{"firstName":"houssem2_employee","email":"mail2@getMaxListeners.com","has_image":"true"}]}
    if (employees_images && employees_images?.length > 0) {
      for (let i = 0; i < employee.length; i++) {
        employee[i].relatedCompany = current_company._id;
        if (employee[i].has_image) {
          const file_name = 'emp_image_' + employee[i].email + '.jpeg';
          employee[i].profileImage = file_name;
          await this.filesService.uploadFile(
            employees_images[image_index].buffer,
            file_name,
          );
          image_index++;
        } else employee[i].profileImage = null;
      }
    }else {
      for (let i = 0; i < employee.length; i++) {
        employee[i].relatedCompany = current_company._id;
        if (employee[i].has_image==false)  employee[i].profileImage = null;
       }

    }


    const result = await this.usersService.registerEmployeesService(
      employee,
      this.jwtService,
    );
    console.log('resultt : ', result)
    await this.CompanyService.updateCompany(userPro._id, {
      employees: result,
    });

    let company_conditions = { show_public_employees };

    await this.CompanyService.updateCompany(userPro._id, company_conditions);

    return apiReturner(HttpStatus.OK, SUCCEEDED);
    /* add the users to the company */
  }

  async signOutService(me: UserToken, notificationDeviceToken: string) {
    const iSuccess = await this.usersService.updateServices(me._id, {
      $pull: {
        notificationDeviceToken: notificationDeviceToken,
      },
    });
    if (iSuccess) {
      apiReturner(HttpStatus.OK, SUCCEEDED);
    } else {
      throw new HttpException(
        SOMETHING_WENT_WRONG,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async fetchUserByToken(user) {
    const user_data = await this.usersService.fetchUserByToken(user);
    return apiReturner(HttpStatus.CREATED, SUCCEEDED, {
      user_data,
    });
  }


  async addingLevelServiceOnev2(user: UserToken, categorieList: OneLevelDto) {
    let companyCat = [];
    let errors;
    let nbCatParent = 0
    let nbnewCat=0
    let CatPArentList = []
    let catParentForOther = null
    
 //! check parent cat number
 categorieList.categories.map(async (cat) => {
  if (!CatPArentList.some((data)=>cat.parent_cat)) {
    CatPArentList.push(cat.parent_cat)
    nbCatParent += 1  
  }
})
if (nbCatParent > 2) {
throw new HttpException('Invalid parent IDs',HttpStatus.NOT_ACCEPTABLE);
    }
     //! check parent cat for other
    categorieList.categories.map(async (cat) => { 
      if (!cat.cat_id && cat.parent_cat != catParentForOther) {
         catParentForOther=cat.parent_cat
      } else if(!cat.cat_id && cat.parent_cat == catParentForOther)   {
        // errors=true
      }
    })
   

    // if (nbnewCat > 2 ||errors) {
    //   throw new HttpException('Invalid new categories  ',HttpStatus.NOT_ACCEPTABLE);
    // }


   

    await Promise.all(
      categorieList.categories.map(async (cat) => {
        if (cat.cat_id == null || cat.cat_id == undefined || cat.cat_id == '') {
          // console.log('heeere');
          // console.log(cat.parent_cat);
          
          const isParent = await this.categoryService.isParent(cat.parent_cat);
// console.log(isParent);

          if (isParent == true) {
            const categorie: CreateCategoryDto = {
              imageUrl: null,
              content: JSON.stringify({"fr":cat.cat_name,"en":cat.cat_name,"es":cat.cat_name}),
              name: cat.cat_name,
              parentCategory: cat.parent_cat,
              active: false,
            };
            const newCategorieDemand = await this.categoryService.createFrom(
              categorie,
              null,
            );

            companyCat.push(newCategorieDemand._id);
          } else {
            errors = true;
          }
        } else {
          companyCat.push(cat.cat_id);
        }
      }),
    );
    // console.log(errors);
    
    if (errors) {
      throw new InternalServerErrorException('Invalid parent ID');
    }
    let categories = companyCat;
    const newCompany = { categories, reletedTo: user._id };
    const companyCreated = await this.CompanyService.createWithUpsertCompany(
      user._id,
      newCompany,
    );
    if (companyCreated) {
      const updatedUser = await this.usersService.updateServices(user._id, {
        relatedCompany: companyCreated._id,
        configurationLevel: 2,
      });
      if (updatedUser) {

        return apiReturner(HttpStatus.CREATED, SUCCEEDED, { relatedCompany: companyCreated._id });
      } else {
        throw new Error('User_Not_Updated');
      }
    } else {
      throw new Error('Company not created');
    }
    
  }



  async updateTeamServiceWeb(
    employee: any,
    show_public_employees: any,
    userPro: UserToken,
    employees_images_web
  ) {
    let image_index = 0;
    const current_company = await this.CompanyService.getCompanyByUserId(
      userPro._id,
    );
    //{"employees":[{"firstName":"houssem1_employee","email":"mail@getMaxListeners.com","has_image":"false"},{"firstName":"houssem2_employee","email":"mail2@getMaxListeners.com","has_image":"true"}]}
    if (employees_images_web?.length > 0) {
      for (let i = 0; i < employee.length; i++) {
        employee[i].relatedCompany = current_company._id;
        if (employee[i].has_image) {
          if (!(employees_images_web[image_index].buffer.byteLength === 0)) {
            console.log(employee[i]);
            console.log('Buffer is not empty');
            const file_name = 'emp_image_' + employee[i].email + '.jpeg';
            employee[i].profileImage = file_name;
            await this.filesService.uploadFile(
              employees_images_web[image_index].buffer,
              file_name,
            );
            image_index++;
          
          } else {
            console.log('Buffer is empty');
            image_index++;
          }
          
        } else employee[i].profileImage = null;
      }
    }else {
      for (let i = 0; i < employee.length; i++) {
        employee[i].relatedCompany = current_company._id;
        if (employee[i].has_image==false)  employee[i].profileImage = null;
       }
    }

    const result = await this.usersService.registerEmployeesService(
      employee,
      this.jwtService,
    );
    console.log('resultt : ', result)
    await this.CompanyService.updateCompany(userPro._id, {
      employees: result,
    });

    let company_conditions = { show_public_employees };

    await this.CompanyService.updateCompany(userPro._id, company_conditions);

    return apiReturner(HttpStatus.OK, SUCCEEDED);
    /* add the users to the company */
  }



}
